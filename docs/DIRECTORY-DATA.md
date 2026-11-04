# Directory data

The directory at `/directory/` lists every business in a county, A to Z. The listings are static files, so there's no database cost.

## Where listings come from

- **Overture Maps Foundation places** (license: CDLA Permissive 2.0, free for business use with credit). For each place we keep the name, type, address, phone, website, one social link and its map location.
- We never write emails, even when the source has them. Unverified listings have no photos.
- We don't copy Google or Yelp data or their star ratings.

## Files

- `public/data/dir/<county fips>/index.json` holds the business types (headings), one point per business for the distance counts, and ZIP and town centers.
- `public/data/dir/<county fips>/fam/<family>.json` holds the listings for one family of types (for example `restaurant` or `home_service`).

## Rebuilding a county

`tools/build_directory.py` builds the files from a parquet of Overture places around the county and the county boundary:

```
python3 tools/build_directory.py places.parquet boundaries.json 06097 "Sonoma County" public/data/dir
```

When building those inputs, read only the parts of the Overture files whose bounding box overlaps the county. The places come from `theme=places/type=place`, and the boundary comes from `theme=divisions/type=division_area` with subtype `county`.

The script:

- drops closed places, low-confidence places, places outside the county line, parks and other non-businesses, and duplicates (same name within about 100 meters).

## Contractor licenses (California)

`tools/add_licenses.py` adds the state contractor license list (CSLB public data portal, "List by Classification and County") to a county's files. Run it after `build_directory.py`:

```
python3 tools/add_licenses.py cslb_downloads/ 06097 public/data/dir
```

- Download one `.xlsx` per classification for the county. The state site turns away requests that come too fast, so wait between downloads and retry the ones that come back as an error page (the script skips files that aren't spreadsheets).
- Only active (CLEAR, not expired) licenses are used.
- Each license is matched to a listing by phone, or by the same name in the same ZIP or town. A matched listing gets three more fields: license number, classifications, and 1 if the contractor told the state it has no employees (workers comp exempt), else 0.
- A license with no matching listing becomes a new listing (id `cslb-<number>`) under the closest business type. These never show a street address, because many are home addresses. They sit at the ZIP center for distance.
- Running it again removes what the last run added first.

Sonoma, Nov 4 2026: 5,350 active licenses, 788 listings matched, 4,439 contractors added.
