"""Count local businesses in each county, for the Work page's starting number.

Uses the Census County Business Patterns county file (businesses with employees).
Writes public/data/rai/county-businesses.json as {"year": 2023, "counts": {"06097": 14572, ...}}.
Run by the Rai's numbers workflow. No key needed.
"""
import csv, datetime, io, json, os, sys, urllib.request, zipfile

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "rai", "county-businesses.json")


def fetch(year):
    yy = str(year)[2:]
    url = "https://www2.census.gov/programs-surveys/cbp/datasets/%d/cbp%sco.zip" % (year, yy)
    req = urllib.request.Request(url, headers={"User-Agent": "dandelions-rai-numbers"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return zipfile.ZipFile(io.BytesIO(r.read()))


def main():
    this = datetime.date.today().year
    for year in range(this - 1, this - 5, -1):
        try:
            z = fetch(year)
            break
        except Exception as e:
            print("No county file for %d (%s)" % (year, e))
    else:
        print("No county business file found. Keeping the old one.")
        return 0
    name = [n for n in z.namelist() if n.lower().endswith(".txt")][0]
    counts = {}
    with z.open(name) as f:
        rows = csv.DictReader(io.TextIOWrapper(f, encoding="latin-1"))
        for row in rows:
            row = {k.strip().lower(): (v or "").strip() for k, v in row.items()}
            if row.get("naics", "").strip("-/ ") != "":
                continue  # only the all-industries total
            fips = row["fipstate"].zfill(2) + row["fipscty"].zfill(3)
            if fips.endswith("999"):
                continue  # statewide, no county
            counts[fips] = int(row["est"])
    if len(counts) < 2500:
        print("Only %d counties found. Keeping the old file." % len(counts))
        return 0
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"year": year, "counts": counts}, f, separators=(",", ":"), sort_keys=True)
    print("Saved %d counties from %d" % (len(counts), year))
    return 0


if __name__ == "__main__":
    sys.exit(main())
