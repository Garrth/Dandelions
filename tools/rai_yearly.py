#!/usr/bin/env python3
"""Rai's yearly numbers: refresh the slow-changing part of tools/rai/<fips>.json for each county.

Parts, each pulled on its own so one bad day doesn't stop the rest:
- livingWage: MIT Living Wage Calculator (hourly wages, and the monthly costs for one adult used by the
  Quality of life baseline). No key needed.
- people: Census American Community Survey 5-year (people, households, renters, median rent).
  Needs CENSUS_API_KEY. Skipped without it.
- businesses: businesses with staff from public/data/rai/county-businesses.json (County Business Patterns),
  and one-person businesses from the Census Nonemployer Statistics (needs CENSUS_API_KEY).

A part is only pulled when it's missing or more than 300 days old, so the weekly run does almost nothing.
Run: python3 tools/rai_yearly.py            (refresh what's due)
     python3 tools/rai_yearly.py --all      (refresh everything now)
The Rai's numbers workflow runs it before the weekly numbers.
"""
import datetime, glob, html, json, os, re, sys, urllib.parse, urllib.request

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
        try:
            year, r = latest('%d/nonemp', {'get': 'NESTAB', 'for': 'county:' + fips[2:], 'in': 'state:' + fips[:2], 'NAICS2017': '00'})
            out['onePerson'] = int(r['NESTAB'])
            out['onePersonYear'] = year
        except Exception as e:
            log(fips, 'nonemployer count failed:', e)
    return out, ['Census County Business Patterns and Nonemployer Statistics', 'https://www.census.gov/programs-surveys/cbp.html']


def add_source(y, src):
    srcs = [s for s in y.get('sources', []) if s[1] != src[1] and s[0].split(',')[0] != src[0].split(',')[0]]
    srcs.append(src)
    y['sources'] = srcs


def main():
    for p in sorted(glob.glob(os.path.join(ROOT, 'tools', 'rai', '*.json'))):
        c = json.load(open(p))
        y = c.setdefault('yearly', {})
        fips, changed = c['fips'], False
        parts = [('livingWage', mit, True), ('people', people, bool(KEY)), ('businesses', businesses, True)]
        for name, fn, can in parts:
            if not can or not due(y.get(name)):
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
        if changed:
            y['pulled'] = TODAY.strftime('%b %-d, %Y')
            with open(p, 'w') as f:
                json.dump(c, f, indent=1, ensure_ascii=False)
                f.write('\n')
            log(fips, 'yearly numbers updated')
        else:
            log(fips, 'yearly numbers up to date')


if __name__ == '__main__':
    main()
