"""Pull Overture Maps places and county boundaries for an area, reading only the parts of the
release whose bounding box overlaps it (the files are big; this reads a small slice over https).

python3 tools/pull_overture.py 2026-10-21.0 "-123.64,36.89,-121.20,38.87" places.parquet boundaries.json "Alameda County,Marin County"

Writes places.parquet (input for build_directory.py) and boundaries.json ({county name: WKT}).
"""
import json, re, subprocess, sys
import fsspec, pyarrow as pa, pyarrow.compute as pc, pyarrow.parquet as pq
from shapely import wkb
from shapely.ops import unary_union

release, box, out_places, out_bounds, names = sys.argv[1:6]
X0, Y0, X1, Y1 = map(float, box.split(','))
want = [n.strip() for n in names.split(',') if n.strip()]
BASE = 'https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com/'
fs = fsspec.filesystem('http', client_kwargs={'trust_env': True}, block_size=4 * 1024 * 1024)

def keys(prefix):
    out, token = [], None
    while True:
        url = BASE + '?list-type=2&prefix=' + prefix + ('&continuation-token=' + token if token else '')
        xml = subprocess.run(['curl', '-sS', url], capture_output=True, text=True).stdout
        out += [k for k in re.findall(r'<Key>([^<]*)', xml) if k.endswith('.parquet') or 'part-' in k]
        m = re.search(r'<NextContinuationToken>([^<]*)', xml)
        if not m: return out
        token = m.group(1).replace('+', '%2B').replace('=', '%3D').replace('/', '%2F')

def slice_of(key, cols, extra=None):
    f = pq.ParquetFile(fs.open(BASE + key))
    md = f.metadata
    ix = {md.schema.column(i).path: i for i in range(md.num_columns)}
    hits = []
    for r in range(md.num_row_groups):
        g = md.row_group(r)
        x0, x1 = g.column(ix['bbox.xmin']).statistics, g.column(ix['bbox.xmax']).statistics
        y0, y1 = g.column(ix['bbox.ymin']).statistics, g.column(ix['bbox.ymax']).statistics
        if x1.max >= X0 and x0.min <= X1 and y1.max >= Y0 and y0.min <= Y1: hits.append(r)
    if not hits: return None
    t = f.read_row_groups(hits, columns=[c for c in cols if c in f.schema_arrow.names])
    b = t.column('bbox').combine_chunks()
    m = pc.and_(pc.and_(pc.greater_equal(pc.struct_field(b, 'xmax'), X0), pc.less_equal(pc.struct_field(b, 'xmin'), X1)),
                pc.and_(pc.greater_equal(pc.struct_field(b, 'ymax'), Y0), pc.less_equal(pc.struct_field(b, 'ymin'), Y1)))
    t = t.filter(m)
    if extra is not None: t = t.filter(extra(t))
    print(key[-50:], len(hits), 'row groups,', t.num_rows, 'rows', flush=True)
    return t

# County lines first (small).
bounds = {}
for k in keys('release/%s/theme=divisions/type=division_area/' % release):
    t = slice_of(k, ['id', 'names', 'subtype', 'country', 'region', 'geometry', 'bbox'],
                 lambda t: pc.and_(pc.equal(t.column('subtype'), 'county'), pc.equal(t.column('region'), 'US-CA')))
    if t is None: continue
    for r in t.to_pylist():
        n = (r['names'] or {}).get('primary') or ''
        if not n.endswith(' County'): n += ' County'  # Overture calls it just "San Francisco"
        if n in want: bounds.setdefault(n, []).append(wkb.loads(r['geometry']))
# A county can come in more than one piece (land, and land plus water). Join them.
bounds = {n: unary_union(g).wkt for n, g in bounds.items()}
json.dump(bounds, open(out_bounds, 'w'))
print('boundaries:', sorted(bounds), flush=True)

if '--bounds-only' in sys.argv: sys.exit()
tables = []
for k in keys('release/%s/theme=places/type=place/' % release):
    t = slice_of(k, ['id', 'names', 'taxonomy', 'socials', 'categories', 'basic_category', 'confidence', 'websites',
                     'phones', 'addresses', 'operating_status', 'bbox', 'brand'])
    if t is not None: tables.append(t)
t = pa.concat_tables(tables, promote_options='permissive')
pq.write_table(t, out_places)
print(t.num_rows, 'places', flush=True)
