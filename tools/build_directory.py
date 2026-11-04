"""Build the public directory files for one county from Overture Maps places.

Input: a parquet of Overture places around the county (see docs/DIRECTORY-DATA.md),
and the county boundary as WKT. Output: public/data/dir/<fips>/index.json and fam/<family>.json.
Emails are never written. Listings come from Overture Maps (CDLA Permissive 2.0).
"""
import json, math, os, re, sys, statistics, collections
import pyarrow.parquet as pq
from shapely import wkt
from shapely.geometry import Point
from shapely.prepared import prep

places, boundary, fips, name, out_root = sys.argv[1:6]
poly = prep(wkt.loads(json.load(open(boundary))[name]))

SKIP = re.compile(r'(^|_)(park|trail|beach|land_feature|water_feature|historic_site|monument|landmark|atm|public_toilet|parking|bus_stop|geographic_entities|structure_and_geography)($|_)')
TOWN_FIX = {'saint helena': 'St Helena', 'st. helena': 'St Helena', 'sonoma county': '', 'napa county': ''}

def town_of(s):
    s = (s or '').strip().replace('-', ' ')
    k = s.lower()
    if k in TOWN_FIX: return TOWN_FIX[k]
    return ' '.join(w if w.isupper() and len(w) <= 3 and w not in ('THE',) else w.capitalize() for w in s.split()) if s.isupper() else s

def phone_of(p):
    d = re.sub(r'\D', '', p or '')
    if len(d) == 11 and d[0] == '1': d = d[1:]
    return f'({d[:3]}) {d[3:6]}-{d[6:]}' if len(d) == 10 else ''

LABELS = {'b2b_service': 'Business-to-business service', 'non_alcoholic_beverage_venue': 'Juice, tea & soda spot',
          'alcoholic_beverage_venue': 'Bar, winery & brewery', 'outpatient_care_facility': 'Clinic & outpatient care'}

def label_of(slug):
    if slug in LABELS: return LABELS[slug]
    s = slug.replace('_', ' ').replace(' and ', ' & ')
    return s[:1].upper() + s[1:]

def norm(n):
    return re.sub(r'[^a-z0-9]', '', (n or '').lower())

rows = pq.read_table(places).to_pylist()
best = {}
for r in rows:
    if r.get('operating_status') == 'permanently_closed' or (r.get('confidence') or 0) < 0.5: continue
    b = r['bbox']; lat = (b['ymin'] + b['ymax']) / 2; lon = (b['xmin'] + b['xmax']) / 2
    if not poly.contains(Point(lon, lat)): continue
    h = (r.get('taxonomy') or {}).get('hierarchy') or []
    if not h or any(SKIP.search(x) for x in h): continue
    nm = ((r.get('names') or {}).get('primary') or '').strip()
    if len(nm) < 2: continue
    key = (norm(nm), round(lat, 3), round(lon, 3))
    if key in best and best[key]['confidence'] >= r['confidence']: continue
    r['_lat'], r['_lon'], r['_h'] = lat, lon, h
    best[key] = r

types, tix = [], {}
def type_index(path):
    # path: hierarchy list; returns index of the last node, creating parents first
    parent = -1
    start = 1 if len(path) > 1 else 0
    for i in range(start, len(path)):
        slug = path[i]
        if slug not in tix:
            tix[slug] = len(types)
            types.append([slug, label_of(slug), parent, path[1] if len(path) > 1 else path[0]])
        parent = tix[slug]
    return parent

fams = collections.defaultdict(list)
pts, zips, towns = [], collections.defaultdict(list), collections.defaultdict(list)
for i, r in enumerate(sorted(best.values(), key=lambda r: norm(r['names']['primary']))):
    t = type_index(r['_h'])
    a = (r.get('addresses') or [{}])[0] or {}
    town = town_of(a.get('locality'))
    z = (a.get('postcode') or '')[:5]
    lat, lon = round(r['_lat'], 5), round(r['_lon'], 5)
    web = next((w for w in (r.get('websites') or []) if w), '')
    soc = next((s for s in (r.get('socials') or []) if s), '')
    fam = types[t][3]
    fams[fam].append([r['id'], r['names']['primary'].strip(), t, lat, lon, a.get('freeform') or '', town, z,
                      phone_of((r.get('phones') or [''])[0]), web, soc])
    pts.extend([t, round(lat * 1e4), round(lon * 1e4)])
    if z: zips[z].append((lat, lon))
    if town: towns[town].append((lat, lon))

def centers(d, minimum):
    return {k: [round(statistics.median(p[0] for p in v), 4), round(statistics.median(p[1] for p in v), 4)]
            for k, v in sorted(d.items()) if len(v) >= minimum}

out = os.path.join(out_root, fips)
os.makedirs(os.path.join(out, 'fam'), exist_ok=True)
allp = [p for v in towns.values() for p in v]
index = {
    'fips': fips, 'name': name, 'count': len(best),
    'source': 'Overture Maps Foundation places, release 2026-10-21.0 (CDLA Permissive 2.0)',
    'center': [round(statistics.median(p[0] for p in allp), 4), round(statistics.median(p[1] for p in allp), 4)],
    'types': types, 'pts': pts, 'zips': centers(zips, 3), 'towns': centers(towns, 5),
}
json.dump(index, open(os.path.join(out, 'index.json'), 'w'), separators=(',', ':'))
for f, lst in fams.items():
    json.dump(lst, open(os.path.join(out, 'fam', f + '.json'), 'w'), separators=(',', ':'))
print(len(best), 'listings,', len(types), 'headings,', len(fams), 'families')
