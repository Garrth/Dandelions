"""Write public/data/dir/open.json: the counties the directory covers, and every ZIP and town in them.
The site reads this first to know where you are and which counties are close enough to load.

python3 tools/build_region.py boundaries.json public/data/dir 06097 06001 ...
"""
import json, os, sys
from shapely import wkt

bounds, root, order = sys.argv[1], sys.argv[2], sys.argv[3:]
geo = json.load(open(bounds))
out = {'counties': [], 'zips': {}, 'towns': {}}
for fips in order:
    idx = json.load(open(os.path.join(root, fips, 'index.json')))
    x0, y0, x1, y1 = wkt.loads(geo[idx['name']]).bounds
    out['counties'].append({'fips': fips, 'name': idx['name'], 'count': idx['count'], 'center': idx['center'],
                            'box': [round(y0, 3), round(x0, 3), round(y1, 3), round(x1, 3)]})
    # A ZIP or town that crosses a county line keeps the county with more businesses in it (listed first wins ties).
    for z, c in idx['zips'].items(): out['zips'].setdefault(z, c + [fips])
    for t, c in idx['towns'].items(): out['towns'].setdefault(t, c + [fips])
out['zips'] = dict(sorted(out['zips'].items()))
out['towns'] = dict(sorted(out['towns'].items()))
json.dump(out, open(os.path.join(root, 'open.json'), 'w'), separators=(',', ':'))
print(len(out['counties']), 'counties,', len(out['zips']), 'ZIPs,', len(out['towns']), 'towns')
