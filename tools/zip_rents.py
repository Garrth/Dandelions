#!/usr/bin/env python3
"""Rent by ZIP code, for the cost-of-living table on the Quality of life baseline.

Looks up every ZIP code in the country in the Census American Community Survey (5-year) and saves the
median gross rent for a studio (rent plus utilities), with a 1-bedroom number as a backup when a
ZIP has too few studios to report. Saves one file per state, public/data/rai/rent-<state fips>.json
(California is rent-06.json), using public/data/zip-county.json to tell which state a ZIP is in.

Needs a free Census API key in the CENSUS_API_KEY environment variable (never commit it).
Get one at https://api.census.gov/data/key_signup.html. Without a key it does nothing.
Run: CENSUS_API_KEY=... python3 tools/zip_rents.py
The Rai's numbers workflow runs it each week when the CENSUS_API_KEY repository secret is set.
"""
import datetime, json, os, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = os.environ.get('CENSUS_API_KEY', '').strip()
STUDIO, ONE_BED = 'B25031_002E', 'B25031_003E'


def get(year, zips):
    params = {'get': STUDIO + ',' + ONE_BED, 'for': 'zip code tabulation area:' + ','.join(zips), 'key': KEY}
    url = 'https://api.census.gov/data/%d/acs/acs5?%s' % (year, urllib.parse.urlencode(params, safe=':,*'))
    req = urllib.request.Request(url, headers={'User-Agent': 'dandelions-rai-numbers'})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def rent(v):
    try:
        n = int(float(v))
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None  # the Census uses negative numbers for "not enough data"


def latest_year():
    # The 5-year survey comes out each December for the year before last. Try the newest first.
    y = datetime.date.today().year - 1
    for year in (y, y - 1, y - 2):
        try:
            get(year, ['95404'])
            return year
        except Exception:
            continue
    raise SystemExit('Could not reach the Census survey. Check the CENSUS_API_KEY.')


def main():
    if not KEY:
        print('No CENSUS_API_KEY, skipping ZIP rents.')
        return
    zip_county = json.load(open(os.path.join(ROOT, 'public', 'data', 'zip-county.json')))
    year = latest_year()
    # One call gets every ZIP in the country (about 33,000 rows). Each state gets its own small file,
    # so any member's ZIP has a number, whatever county they're in.
    rows = get(year, ['*'])
    by_state = {}
    for studio, one_bed, z in rows[1:]:
        st, o = rent(studio), rent(one_bed)
        county = zip_county.get(z)
        if (st or o) and county:
            by_state.setdefault(county[:2], {})[z] = {'rent': st or o, 'kind': 'studio' if st else '1 bedroom'}
    for state in sorted(by_state):
        dest = os.path.join(ROOT, 'public', 'data', 'rai', 'rent-%s.json' % state)
        data = {'source': 'Census American Community Survey 5-year, %d-%d, median gross rent (rent plus utilities)' % (year - 4, year),
                'year': year, 'zips': by_state[state]}
        old = json.load(open(dest)) if os.path.exists(dest) else None
        if old != data:
            with open(dest, 'w') as f:
                json.dump(data, f, separators=(',', ':'), sort_keys=True)
                f.write('\n')
            print('Saved', dest, len(by_state[state]), 'ZIPs')


if __name__ == '__main__':
    main()
