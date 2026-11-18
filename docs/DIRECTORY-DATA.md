# Directory data

The directory at `/directory/` lists every business in the 9 Bay Area counties, A to Z. Searches reach across county lines. The listings are static files, so there's no database cost.

## Where listings come from

- **Overture Maps Foundation places** (license: CDLA Permissive 2.0, free for business use with credit). For each place we keep the name, type, address, phone, website, one social link and its map location.
- We never write emails, even when the source has them. Unverified listings have no photos.
- We don't copy Google or Yelp data or their star ratings.

## Files

- `public/data/dir/open.json` lists the open counties (with a box around each, so the site loads only the counties within reach), and every ZIP and town in them.
- `public/data/dir/types.json` is the one list of business types (headings) all counties share.
- `public/data/dir/<county fips>/index.json` holds one point per business for the distance counts, and ZIP and town centers.
- `public/data/dir/<county fips>/fam/<family>.json` holds the listings for one family of types (for example `restaurant` or `home_service`).

## Businesses members add

Members can add a business anywhere in the US at `/directory/add.html`. These live in the `added_listings` table (ids start with `add-`), show right away, and the owner claims them with a phone code like any listing. Whoever added one can take it down from the listing page. Nothing is deleted: a take-down sets `status = 'removed'`, so it can be put back. In open counties they sit at their ZIP center for distance. Elsewhere they show on the directory home for that county.

## Adding counties or rebuilding

1. `tools/pull_overture.py` reads places and county lines for an area from the Overture release.
2. `tools/build_directory.py` builds each county (below).
3. `tools/get_cslb.py` then `tools/add_licenses.py` add contractor licenses (California).
4. `tools/share_types.py public/data/dir 06097 06001 ...` gives every county the shared type list. Always list 06097 first.
5. `tools/build_region.py boundaries.json public/data/dir 06097 06001 ...` writes `open.json`.

Bay Area, Nov 18 2026: Overture release 2026-10-21.0, 377,801 listings in all, 1,807 business types.

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
