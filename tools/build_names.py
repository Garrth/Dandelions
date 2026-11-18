"""Write the business-name search files for each county: public/data/dir/<fips>/names/<two letters>.json.
A business is in the file for the first two letters of each word of its name (skipping small words
like "the" and "and"), so "Wells and Company Builders" is found by typing "wells", "company" or "builders".
Each entry is [name, type, lat, lon, town, row], where row is the business's place in its family file
(the family comes from the type), so the site can find its id when it's tapped. Run after build_directory.py and add_licenses.py.

python3 tools/build_names.py public/data/dir 06097 06001 ...
"""
import glob, json, os, re, shutil, sys

root, order = sys.argv[1], sys.argv[2:]
SMALL = {'the', 'and', 'of', 'a', 'an', 'at', 'in', 'on', 'for', 'to', 'by', 'inc', 'llc', 'co', 'corp', 'ltd'}

def letters(name):
    out = set()
    for w in re.findall(r'[a-z0-9]+', name.lower().replace('&', ' ')):
        if w in SMALL: continue
        k = re.sub(r'[^a-z]', '0', w[:2])
        out.add(k if len(k) == 2 else k + '_')
    return out

for fips in order:
    d = os.path.join(root, fips)
    by = {}
    for path in sorted(glob.glob(os.path.join(d, 'fam', '*.json'))):
        for n, b in enumerate(json.load(open(path))):
            e = [b[1], b[2], round(b[3], 4), round(b[4], 4), b[6], n]
            for L in letters(b[1]): by.setdefault(L, []).append(e)
    out = os.path.join(d, 'names')
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    for L, rows in by.items():
        rows.sort(key=lambda e: e[0].lower())
        json.dump(rows, open(os.path.join(out, L + '.json'), 'w'), separators=(',', ':'))
    print(fips, sum(len(v) for v in by.values()), 'entries in', len(by), 'files')
