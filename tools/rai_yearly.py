#!/usr/bin/env python3
"""Rai's yearly numbers: refresh the slow-changing part of tools/rai/<fips>.json for each county.

Parts, each pulled on its own so one bad day doesn't stop the rest:
- livingWage: MIT Living Wage Calculator (hourly wages, and the monthly costs for one adult used by the
  Quality of life baseline). No key needed.
- people: Census American Community Survey 5-year (people, households, renters, median rent).
  Needs CENSUS_API_KEY. Skipped without it.
- businesses: businesses with staff from public/data/rai/county-businesses.json (County Business Patterns),
  and one-person businesses from the Census Nonemployer Statistics (needs CENSUS_API_KEY).
- categories: the Local businesses list (26 kinds of work), from the County Business Patterns county files for
  2019 and the latest year. No key needed. A county with a hand-built list (Sonoma) keeps it.

A part is only pulled when it's missing or more than 300 days old, so the weekly run does almost nothing.
Run: python3 tools/rai_yearly.py            (refresh what's due)
     python3 tools/rai_yearly.py --all      (refresh everything now)
The Rai's numbers workflow runs it before the weekly numbers.
"""
import csv, datetime, glob, html, io, json, os, re, sys, urllib.parse, urllib.request, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = os.environ.get('CENSUS_API_KEY', '').strip()
UA = {'User-Agent': 'dandelions-rai-numbers/1.0 (+https://www.dandelions.lol)'}
TODAY = datetime.date.today()
ALL = '--all' in sys.argv


def log(*a):
    print(*a, file=sys.stderr)


def get(url, timeout=60):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def due(part):
    if ALL or not part or not part.get('asOf'):
        return True
    try:
        return (TODAY - datetime.date.fromisoformat(part['asOf'])).days > 300
    except ValueError:
        return True


# ---- MIT living wage ----
def dollars(text, label):
    """The dollar amounts in the row that starts with label, in table order."""
    m = re.search(re.escape(label) + r'((?:\s*\$[\d,]+(?:\.\d+)?)+)', text)
    if not m:
        raise ValueError('MIT page has no row: ' + label)
    return [float(x.replace(',', '')) for x in re.findall(r'\$([\d,]+(?:\.\d+)?)', m.group(1))]


def mit(fips):
    url = 'https://livingwage.mit.edu/counties/' + fips
    t = html.unescape(re.sub(r'<[^>]+>', ' ', get(url).decode('utf-8', 'replace')))
    t = re.sub(r'\s+', ' ', t)
    wage = dollars(t, 'Living Wage')
    mini = dollars(t, 'Minimum Wage')
    # Column 0 is one adult with no children, the household the baseline uses.
    one = lambda label: dollars(t, label)[0]
    food, medical, housing, transport = one('Food'), one('Medical'), one('Housing'), one('Transportation')
    civic, phone, other, taxes = one('Civic'), one('Internet & Mobile'), one('Other'), one('Annual taxes')
    before = dollars(t, 'Required annual income before taxes')[0]
    upd = re.search(r'updated on ([A-Z][a-z]+) \d{1,2}, (\d{4})', t)
    m = lambda x: int(round(x / 12))
    monthly = {'housing': m(housing), 'food': m(food), 'other': m(other + civic), 'phone': m(phone),
               'transport': m(transport), 'health': m(medical), 'taxes': m(taxes)}
    monthly['total'] = sum(monthly.values())
    monthly['note'] = ('MIT Living Wage Calculator, one adult with no children. Housing includes utilities. '
                       'Other is clothing, personal care, household items and civic life.')
    return {
        'oneAdult': wage[0], 'oneAdultOneChild': wage[1], 'twoWorkingTwoKids': wage[10], 'minimum': mini[0],
        'yearly': int(round(before, -2)),
        'updated': (upd.group(1)[:3] + ' ' + upd.group(2)) if upd else '',
        'monthly': monthly, 'asOf': TODAY.isoformat(),
    }, ['MIT Living Wage Calculator', url]


# ---- Census ----
def census(path, params):
    q = dict(params, key=KEY)
    url = 'https://api.census.gov/data/' + path + '?' + urllib.parse.urlencode(q, safe=':,*')
    rows = json.loads(get(url, 120))
    return dict(zip(rows[0], rows[1]))


def latest(path_fmt, params):
    y = TODAY.year - 1
    for year in range(y, y - 4, -1):
        try:
            return year, census(path_fmt % year, params)
        except Exception:
            continue
    raise RuntimeError('no year found for ' + path_fmt)


def people(fips):
    year, r = latest('%d/acs/acs5', {'get': 'B01003_001E,B11001_001E,B25003_001E,B25003_003E,B25064_001E',
                                     'for': 'county:' + fips[2:], 'in': 'state:' + fips[:2]})
    owned_or_rented = float(r['B25003_001E']) or 1
    return {
        'total': int(r['B01003_001E']), 'households': int(r['B11001_001E']),
        'renters': round(float(r['B25003_003E']) / owned_or_rented, 3), 'medianRent': int(r['B25064_001E']),
        'year': '%d-%d survey' % (year - 4, year), 'asOf': TODAY.isoformat(),
    }, ['Census American Community Survey, %d-%d' % (year - 4, year), 'https://data.census.gov/']


def businesses(fips):
    cbp = json.load(open(os.path.join(ROOT, 'public', 'data', 'rai', 'county-businesses.json')))
    out = {'withStaff': cbp['counts'][fips], 'year': cbp['year'], 'asOf': TODAY.isoformat()}
    if KEY:
        # 2022 on uses NAICS2022 for the all-industries code; older years use NAICS2017.
        for naics in ('NAICS2022', 'NAICS2017'):
            try:
                year, r = latest('%d/nonemp', {'get': 'NESTAB', 'for': 'county:' + fips[2:], 'in': 'state:' + fips[:2], naics: '00'})
                out['onePerson'] = int(r['NESTAB'])
                out['onePersonYear'] = year
                break
            except Exception as e:
                log(fips, 'nonemployer count failed with', naics, e)
    return out, ['Census County Business Patterns and Nonemployer Statistics', 'https://www.census.gov/programs-surveys/cbp.html']


# ---- Local businesses list ----
# Name, note and the NAICS codes added together. Notes match Sonoma's hand-built list.
CATS = [
    ('Home improvement and repair', 'Plumbing, electrical, roofing, painting, remodeling', ['236118', '2381', '2382', '2383']),
    ('Landscaping and gardening', '', ['561730']),
    ('Automotive', 'General car repair', ['811111']),
    ('Restaurants and cafes', 'Sit-down and counter service', ['7225']),
    ('Catering and events', '', ['7223']),
    ('Groceries and markets', '', ['4451']),
    ('Farming and farm services', "Farm service businesses only. Farms themselves aren't in this count", ['115']),
    ('Wine and beverages', 'Wineries', ['312130']),
    ('Lodging and tourism', 'Hotels and motels', ['721110']),
    ('Dental', '', ['621210']),
    ('Health care', "Doctors' offices", ['6211']),
    ('Mental health and counseling', '', ['621330', '621420']),
    ('Home care and elder care', 'Home health, senior services, nursing homes', ['621610', '623110', '624120']),
    ('Child care', '', ['624410']),
    ('Legal', '', ['5411']),
    ('Accounting and tax', 'CPA offices', ['541211']),
    ('Beauty and personal care', 'Hair, nails, barbers', ['81211']),
    ('Fitness and wellness', '', ['713940']),
    ('Pets and vets', '', ['541940', '812910']),
    ('Cleaning', 'Janitorial services', ['561720']),
    ('Moving and hauling', '', ['484210']),
    ('Rentals and property management', '', ['5311', '5313']),
    ('Retail shops', 'All stores', ['44']),
    ('Manufacturing', '', ['31']),
    ('Printing and signs', '', ['3231', '339950']),
    ('Tech and computer repair', '', ['5415', '8112']),
]
CODES = {c for _, _, codes in CATS for c in codes}


def cbp_file(year, want):
    """{fips: {naics: (est, emp, ap)}} for the counties in want, from one year's CBP county file."""
    url = 'https://www2.census.gov/programs-surveys/cbp/datasets/%d/cbp%sco.zip' % (year, str(year)[2:])
    z = zipfile.ZipFile(io.BytesIO(get(url, 300)))
    name = [n for n in z.namelist() if n.lower().endswith('.txt')][0]
    out = {}
    with z.open(name) as f:
        for row in csv.DictReader(io.TextIOWrapper(f, encoding='latin-1')):
            row = {k.strip().lower(): (v or '').strip() for k, v in row.items()}
            fips = row['fipstate'].zfill(2) + row['fipscty'].zfill(3)
            code = row['naics'].strip('-/ ')
            if fips in want and code in CODES:
                out.setdefault(fips, {})[code] = (int(row['est'] or 0), int(row['emp'] or 0), int(row['ap'] or 0))
    if not out:
        raise ValueError('no rows for these counties in %d' % year)
    return out


def categories(now, then):
    """The list for one county, from its rows now and in 2019."""
    def add(rows, codes):
        t = [0, 0, 0]
        for c in codes:
            for i, v in enumerate(rows.get(c, (0, 0, 0))):
                t[i] += v
        return t
    pct = lambda a, b: int(round((a / b - 1) * 100)) if b else None
    out = []
    for name, note, codes in CATS:
        est, emp, ap = add(now, codes)
        if not est or not emp:
            continue
        e0, m0, a0 = add(then, codes)
        pay = ap / emp  # $1,000s a worker a year
        c = {'name': name, 'note': note, 'estab': est, 'workers': emp, 'pay': round(pay, 1)}
        if m0:
            c['workersChange'] = pct(emp, m0)
            c['payChange'] = pct(pay, a0 / m0)
        out.append(c)
    return out


def pull_categories(files):
    """Fill in the Local businesses list for counties that don't have a hand-built one. Returns changed paths."""
    need = {}
    for p, c in files.items():
        y = c.setdefault('yearly', {})
        auto = y.get('categoriesFrom')
        if y.get('categories') and not auto:
            continue  # hand-built, keep it
        if not y.get('categories') or due(auto):
            need[c['fips']] = p
    if not need:
        return set()
    now = None
    for year in range(TODAY.year - 1, TODAY.year - 5, -1):
        try:
            now = year, cbp_file(year, set(need))
            break
        except Exception as e:
            log('No business file for %d (%s)' % (year, e))
    if not now:
        log('Local businesses list: no file found, keeping the old lists')
        return set()
    try:
        then = cbp_file(2019, set(need))
    except Exception as e:
        log('Local businesses list: 2019 file failed, keeping the old lists:', e)
        return set()
    changed = set()
    for fips, p in need.items():
        cats = categories(now[1].get(fips, {}), then.get(fips, {}))
        if len(cats) < 10:
            log(fips, 'Local businesses list: only %d kinds found, keeping the old list' % len(cats))
            continue
        y = files[p]['yearly']
        y['categories'] = cats
        y['categoriesFrom'] = {'year': now[0], 'since': 2019, 'asOf': TODAY.isoformat()}
        add_source(y, ['Census County Business Patterns and Nonemployer Statistics', 'https://www.census.gov/programs-surveys/cbp.html'])
        changed.add(p)
        log(fips, 'Local businesses list updated (%d kinds, %d vs 2019)' % (len(cats), now[0]))
    return changed


def add_source(y, src):
    srcs = [s for s in y.get('sources', []) if s[1] != src[1] and s[0].split(',')[0] != src[0].split(',')[0]]
    srcs.append(src)
    y['sources'] = srcs


def main():
    files = {p: json.load(open(p)) for p in sorted(glob.glob(os.path.join(ROOT, 'tools', 'rai', '*.json')))}
    cat_changed = pull_categories(files)
    for p, c in files.items():
        y = c.setdefault('yearly', {})
        fips, changed = c['fips'], False
        parts = [('livingWage', mit, True), ('people', people, bool(KEY)), ('businesses', businesses, True)]
        for name, fn, can in parts:
            # Also pull businesses again when the one-person count is missing and there's a key.
            late = name == 'businesses' and KEY and 'onePerson' not in (y.get(name) or {})
            if not can or not (due(y.get(name)) or late):
                continue
            try:
                val, src = fn(fips)
            except Exception as e:
                log(fips, name, 'failed, keeping the old numbers:', e)
                continue
            old = y.get(name) or {}
            if name == 'businesses' and 'onePerson' not in val and 'onePerson' in old:
                val['onePerson'] = old['onePerson']
            if {k: v for k, v in val.items() if k != 'asOf'} != {k: v for k, v in old.items() if k != 'asOf'}:
                changed = True
            y[name] = val
            add_source(y, src)
            changed = changed or old.get('asOf') != val.get('asOf')
        if changed or p in cat_changed:
            y['pulled'] = TODAY.strftime('%b %-d, %Y')
            with open(p, 'w') as f:
                json.dump(c, f, indent=1, ensure_ascii=False)
                f.write('\n')
            log(fips, 'yearly numbers updated')
        else:
            log(fips, 'yearly numbers up to date')


if __name__ == '__main__':
    main()
