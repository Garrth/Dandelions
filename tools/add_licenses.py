"""Add California contractor licenses (CSLB) to a county's directory files.

Input: a folder of CSLB "List by Classification and County" downloads (.xlsx, one per
classification) from https://www.cslb.ca.gov/onlineservices/dataportal/ListByCounty
Run after tools/build_directory.py:
    python3 tools/add_licenses.py cslb_folder 06097 public/data/dir

What it does:
- Matches each active license to a listing by phone, or by name in the same ZIP or town.
- A matched listing gets the license number, its classifications, and a "no employees" flag
  (workers comp exempt, which the contractor declares to the state).
- A license with no matching listing becomes a new listing under the closest business type.
  These show the town only, never the street address (many are home addresses),
  and sit at the ZIP center for distance.
Running it again first removes what the last run added, so it is safe to repeat.
"""
import collections, datetime, glob, json, os, re, sys
import openpyxl

src, fips, root = sys.argv[1], sys.argv[2], sys.argv[3]
out = os.path.join(root, fips)
index = json.load(open(os.path.join(out, 'index.json')))
types = index['types']
slug_idx = {t[0]: n for n, t in enumerate(types)}

# Closest directory type for each classification. Anything not listed is "Contractor".
CLASS_TYPE = {
    'B': 'building_contractor', 'B-2': 'altering_and_remodeling_contractor', 'C-2': 'insulation_installation',
    'C-4': 'hvac_service', 'C-5': 'carpenter', 'C-6': 'cabinet_sales_service', 'C-7': 'home_network_installation',
    'C-8': 'masonry_concrete', 'C-9': 'drywall_service', 'C-10': 'electrician', 'C-12': 'excavation_service',
    'C-13': 'fence_and_gate_sales_service', 'C-15': 'flooring_contractor', 'C-16': 'fire_protection_service',
    'C-17': 'glass_and_mirror_sales_service', 'C-20': 'hvac_service', 'C-21': 'demolition_service',
    'C-27': 'landscaping', 'C-28': 'key_and_locksmith', 'C-29': 'masonry_contractor', 'C-32': 'paving_contractor',
    'C-33': 'painting', 'C-35': 'drywall_service', 'C-36': 'plumbing', 'C-38': 'hvac_service', 'C-39': 'roofing',
    'C-42': 'plumbing', 'C-46': 'solar_installation', 'C-49': 'tree_service', 'C-53': 'pool_and_hot_tub_service',
    'C-54': 'tiling', 'C-55': 'water_purification_service', 'C-57': 'well_drilling', 'C-60': 'welder',
    'D-3': 'patio_covers', 'D-6': 'masonry_concrete', 'D-16': 'door_sales_service', 'D-28': 'door_sales_service',
    'D-29': 'painting', 'D-35': 'pool_and_hot_tub_service', 'D-41': 'siding', 'D-49': 'tree_service',
    'D-52': 'shades_and_blinds', 'D-56': 'excavation_service', 'D-59': 'landscaping', 'D-62': 'hvac_service',
    'D-63': 'junk_removal_and_hauling', 'D-65': 'insulation_installation',
}
GENERAL = {'A', 'B', 'B-2', 'C-61'}  # broad classes; a more specific one wins for the type
TRADES = {'home_service', 'building_or_construction_service'}

def digits(p):
    d = re.sub(r'\D', '', p or '')
    return d[-10:] if len(d) >= 10 else ''

STOP = {'inc', 'llc', 'corp', 'corporation', 'co', 'company', 'the', 'ltd', 'lp', 'dba', 'and', 'of'}
def norm(n):
    w = re.sub(r'[^a-z0-9 ]', ' ', (n or '').lower().replace('&', ' and ')).split()
    return ' '.join(x for x in w if x not in STOP)

UPPER = {'LLC', 'HVAC', 'USA', 'II', 'III', 'IV', 'DBA', 'LP', 'RV', 'AC', 'CA'}
def nice(name):
    def word(w):
        if w.upper() in UPPER: return w.upper()
        return re.sub(r"(^|[-'/(])([a-z])", lambda m: m.group(1) + m.group(2).upper(), w.lower())
    return ' '.join(word(w) for w in name.split())

def town_of(c):
    c = (c or '').strip().title()
    return {'Saint Helena': 'St Helena'}.get(c, c)

# ---- Read the licenses ----
today = datetime.date.today()
lic = {}
for path in sorted(glob.glob(os.path.join(src, '*.xlsx'))):
    try:
        ws = openpyxl.load_workbook(path, read_only=True).active
    except Exception:
        print('skipped (not a spreadsheet):', path, file=sys.stderr); continue
    rows = ws.iter_rows(values_only=True)
    head = next(rows)
    for r in rows:
        r = dict(zip(head, r))
        if not r.get('LicenseNumber') or (r.get('Status') or '').strip() != 'CLEAR': continue
        try:
            if datetime.datetime.strptime(r['ExpirationDate'], '%m/%d/%Y').date() < today: continue
        except Exception:
            continue
        if (r.get('County') or '').strip().lower() != index['name'].lower().replace(' county', ''): continue
        lic[int(r['LicenseNumber'])] = r
print(len(lic), 'active licenses', file=sys.stderr)

def classes(r):
    # The state writes these as " B | C10 | C-6 | C61/D12"; make them all "C-10" style.
    out = []
    for x in (r.get('Classification(s)') or '').split('|'):
        x = re.sub(r'([CD])-?(\d+)', r'\1-\2', x.strip().upper())
        if x and x not in out: out.append(x)
    return out

# ---- Load the listings, undoing any earlier run ----
fams = {}
for path in glob.glob(os.path.join(out, 'fam', '*.json')):
    f = os.path.basename(path)[:-5]
    fams[f] = [b[:11] for b in json.load(open(path)) if not str(b[0]).startswith('cslb-')]
added_before = index.pop('cslbAdded', 0)
if added_before:
    index['pts'] = index['pts'][:len(index['pts']) - 3 * added_before]
    index['count'] -= added_before

by_phone, by_name = collections.defaultdict(list), collections.defaultdict(list)
for f, lst in fams.items():
    for b in lst:
        if digits(b[8]): by_phone[digits(b[8])].append((f, b))
        by_name[norm(b[1])].append((f, b))

def find(r):
    p, n = digits(r.get('PhoneNumber')), norm(r.get('BusinessName'))
    z, town = str(r.get('ZIP Code') or '')[:5], town_of(r.get('City'))
    hits = [x for x in by_phone.get(p, []) if x[0] in TRADES or norm(x[1][1]) == n] if p else []
    if not hits and n:
        cand = by_name.get(n, [])
        hits = [x for x in cand if x[1][7] == z or x[1][6] == town] or (cand if len(cand) == 1 else [])
    return hits[0] if hits else None

# ---- Match, or add as a new listing ----
matched, added, seen_phone = 0, [], set()
for num in sorted(lic, key=lambda n: (-len(classes(lic[n])), n)):
    r = lic[num]
    cl = classes(r)
    exempt = 1 if (r.get('WorkersCompCoverageType') or '').strip().lower() == 'exempt' else 0
    hit = find(r)
    if hit:
        b = hit[1]
        if len(b) == 11:
            b.extend([num, ' '.join(cl), exempt]); matched += 1
        continue
    p = digits(r.get('PhoneNumber'))
    if p and p in seen_phone: continue  # same business under a second license
    z, town = str(r.get('ZIP Code') or '')[:5], town_of(r.get('City'))
    ll = index['zips'].get(z) or index['towns'].get(town)
    if not ll: continue
    spec = [c.split('/')[-1] for c in cl if c not in GENERAL] + [c for c in cl if c in GENERAL]
    slug = next((CLASS_TYPE[c] for c in spec if CLASS_TYPE.get(c) in slug_idx), 'contractor')
    t = slug_idx[slug]
    f = types[t][3]
    ph = r.get('PhoneNumber') or ''
    phone = '(%s) %s-%s' % (p[:3], p[3:6], p[6:]) if p else ''
    row = ['cslb-%d' % num, nice(r['BusinessName']), t, ll[0], ll[1], '', town, z, phone, '', '', num, ' '.join(cl), exempt]
    fams.setdefault(f, []).append(row)
    added.append(row)
    if p: seen_phone.add(p)

for row in added:
    index['pts'].extend([row[2], round(row[3] * 1e4), round(row[4] * 1e4)])
index['count'] += len(added)
index['cslbAdded'] = len(added)
index['licenses'] = {'source': 'California Contractors State License Board public data portal', 'pulled': today.isoformat()}
for f, lst in fams.items():
    lst.sort(key=lambda b: b[1].lower())
    json.dump(lst, open(os.path.join(out, 'fam', f + '.json'), 'w'), separators=(',', ':'))
json.dump(index, open(os.path.join(out, 'index.json'), 'w'), separators=(',', ':'))
print(matched, 'listings matched to a license,', len(added), 'added from the license list', file=sys.stderr)
