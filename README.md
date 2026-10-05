# Dandelions
The Dandelions website (dandelions.lol)

There's plenty to do. Right now the site collects pledges: people (18+) sign up with an email and ZIP code and confirm by email, and a map shows how close each county is to its goals. There are no tokens and nothing has cash value.

## What's here

- `public/` the website (plain HTML, CSS, JavaScript, no build step)
- `public/data/` county map shapes ([us-atlas](https://github.com/topojson/us-atlas)), county populations (U.S. Census Bureau estimates, via the [JHU CSSE lookup table](https://github.com/CSSEGISandData/COVID-19)), and a ZIP to county lookup (HUD USPS crosswalk, via [zipcodes-nrviens](https://www.npmjs.com/package/zipcodes-nrviens))
- `supabase/migrations/` the database setup
- `docs/SETUP.md` how to set up Supabase and DigitalOcean

## Try it on your computer

```
cd public && python3 -m http.server 8000
```

Then open http://localhost:8000

## License

AGPL-3.0. See `LICENSE`.
