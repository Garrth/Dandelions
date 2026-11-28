#!/usr/bin/env python3
"""Rent by ZIP code, for the cost-of-living table on the Quality of life baseline.

For each county with a file in tools/rai/<fips>.json, looks up every ZIP code in that county
(public/data/zip-county.json) in the Census American Community Survey (5-year) and saves the
median gross rent for a studio (rent plus utilities), with a 1-bedroom number as a backup when a
ZIP has too few studios to report. Saves public/data/rai/rent-<fips>.json.

Needs a free Census API key in the CENSUS_API_KEY environment variable (never commit it).
Get one at https://api.census.gov/data/key_signup.html. Without a key it does nothing.
Run: CENSUS_API_KEY=... python3 tools/zip_rents.py
The Rai's numbers workflow runs it each week when the CENSUS_API_KEY repository secret is set.
"""
import datetime, glob, json, os, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = os.environ.get('CENSUS_API_KEY', '').strip()
STUDIO, ONE_BED = 'B25031_002E', 'B25031_003E'


def get(year, zips):
    params = {'get': STUDIO + ',' + ONE_BED, 'for': 'zip code tabulation area:' + ','.join(zips), 'key': KEY}
    url = 'https://api.census.gov/data/%d/acs/acs5?%s' % (year, urllib.parse.urlencode(params, safe=':,'))
    req = urllib.request.Request(url, headers={'User-Agent': 'dandelions-rai-numbers'})
    with urllib.request.urlopen(req, timeout=60) as r:
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
    for p in sorted(glob.glob(os.path.join(ROOT, 'tools', 'rai', '*.json'))):
        fips = os.path.basename(p)[:5]
        zips = sorted(z for z, c in zip_county.items() if c == fips)
        out = {}
        for i in range(0, len(zips), 50):
            try:
                rows = get(year, zips[i:i + 50])
            except Exception as e:  # a chunk with no ZIP the survey knows returns an error
                print('Skipped some ZIPs in', fips, e, file=sys.stderr)
                continue
            for studio, one_bed, z in rows[1:]:
                s, o = rent(studio), rent(one_bed)
                if s or o:
                    out[z] = {'rent': s or o, 'kind': 'studio' if s else '1 bedroom'}
        dest = os.path.join(ROOT, 'public', 'data', 'rai', 'rent-%s.json' % fips)
        data = {'source': 'Census American Community Survey 5-year, %d-%d, median gross rent (rent plus utilities)' % (year - 4, year),
                'year': year, 'zips': out}
        old = None
        if os.path.exists(dest):
            old = json.load(open(dest))
        if old != data:
            with open(dest, 'w') as f:
                json.dump(data, f, separators=(',', ':'), sort_keys=True)
                f.write('\n')
            print('Saved', dest, len(out), 'ZIPs')
        else:
            print('No change for', fips)


if __name__ == '__main__':
    main()
