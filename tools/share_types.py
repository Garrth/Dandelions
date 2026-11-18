"""Give every county in the directory the same list of business types, so the site can show
businesses from several counties at once (distance ignores county lines). The shared list goes
in public/data/dir/types.json and comes out of each county's index.json.

python3 tools/share_types.py public/data/dir 06097 06001 06013 ...

The first county keeps its numbering. Types from the others are added after it. Each county's
points and listings are renumbered to match. Run it after build_directory.py on any county.
Safe to run again: once the lists match, nothing changes.
"""
import json, os, sys

root, order = sys.argv[1], sys.argv[2:]
tpath = os.path.join(root, 'types.json')
shared = json.load(open(tpath)) if os.path.exists(tpath) else []
at = {t[0]: i for i, t in enumerate(shared)}

def add(types, i, memo):
    # Add type i of a county's list (and its parents first) to the shared list. Returns its shared number.
    if i in memo: return memo[i]
    slug, label, parent, fam = types[i]
    p = add(types, parent, memo) if parent >= 0 else -1
    if slug not in at:
        at[slug] = len(shared)
        shared.append([slug, label, p, fam])
    memo[i] = at[slug]
    return memo[i]

maps = {}
for fips in order:
    idx = json.load(open(os.path.join(root, fips, 'index.json')))
    memo = {}
    if 'types' in idx:  # a county just built; already-shared counties have no list of their own
        for i in range(len(idx['types'])): add(idx['types'], i, memo)
    maps[fips] = memo

for fips in order:
    d = os.path.join(root, fips)
    idx = json.load(open(os.path.join(d, 'index.json')))
    m = maps[fips]
    pts = idx['pts']
    for k in range(0, len(pts), 3): pts[k] = m.get(pts[k], pts[k])
    changed = any(m[i] != i for i in m)
    idx.pop('types', None)
    json.dump(idx, open(os.path.join(d, 'index.json'), 'w'), separators=(',', ':'))
    if any(m[i] != i for i in m):
        for f in os.listdir(os.path.join(d, 'fam')):
            p = os.path.join(d, 'fam', f)
            rows = json.load(open(p))
            for b in rows: b[2] = m.get(b[2], b[2])
            json.dump(rows, open(p, 'w'), separators=(',', ':'))
    print(fips, 'renumbered' if changed else 'already shared')
json.dump(shared, open(tpath, 'w'), separators=(',', ':'))
print(len(shared), 'business types in all')
