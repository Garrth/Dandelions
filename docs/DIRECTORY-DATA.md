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
