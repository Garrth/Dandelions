"""Rebuild public/data/zip-county.json: each ZIP goes to the county where most of its people live.

Uses the 2020 Census (DHC) counts of people in each ZIP code tabulation area, split by county.
Needs a free Census API key in the CENSUS_API_KEY environment variable (never commit it).
ZIPs the Census doesn't cover (like PO box-only ZIPs) keep their old county.
Run: CENSUS_API_KEY=... python3 tools/build_zip_county.py
"""
import json, os, sys, time, urllib.parse, urllib.request

KEY = os.environ["CENSUS_API_KEY"]
API = "https://api.census.gov/data/2020/dec/dhc"
PATH = os.path.join(os.path.dirname(__file__), "..", "public", "data", "zip-county.json")
STATES = ["01", "02", "04", "05", "06", "08", "09", "10", "11", "12", "13", "15", "16", "17", "18", "19", "20", "21", "22",
          "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41",
          "42", "44", "45", "46", "47", "48", "49", "50", "51", "53", "54", "55", "56", "72"]

def get(params):
    url = API + "?" + urllib.parse.urlencode(params, doseq=True, safe=":*,()") + "&key=" + KEY
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return json.load(r)[1:]
        except Exception as e:
            if attempt == 3: raise
            time.sleep(2 ** attempt)

old = json.load(open(PATH))
best = {}  # zip -> (people, county fips)
for st in STATES:
    zips = [row[2] for row in get({"get": "P1_001N", "for": "zip code tabulation area (or part):*", "in": "state:" + st})]
    for i in range(0, len(zips), 150):
        chunk = ",".join(zips[i:i + 150])
        rows = get({"get": "P1_001N", "for": "county (or part):*", "in": ["state:" + st, "zip code tabulation area (or part):" + chunk]})
        for people, s, z, c in rows:
            people = int(people)
            if z not in best or people > best[z][0]:
                best[z] = (people, s + c)
    print(st, len(zips), "zips", file=sys.stderr)

# Only use counties the site's map knows (public/data/counties.json), so pledges always land on the map.
known = json.load(open(os.path.join(os.path.dirname(PATH), "counties.json")))
out = dict(old)
changed = 0
for z, (people, fips) in best.items():
    if (people == 0 and z in old) or fips not in known: continue
    if out.get(z) != fips: changed += 1
    out[z] = fips
json.dump(dict(sorted(out.items())), open(PATH, "w"), separators=(",", ":"))
print(len(out), "zips,", changed, "changed")
