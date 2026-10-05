# Dandelions
The Dandelions website (dandelions.lol)

Dandelions is building money that's worked into existence, debt-free, for the work people and the planet need. Right now the site collects pledges: people (18+) sign up with an email and ZIP code and confirm by email. There are no tokens and nothing has cash value.

## What's here

- `public/` the website (plain HTML, CSS, JavaScript, no build step). The home page is a coming soon page for now; the pledge page is at `/preview.html` for testing.
- `supabase/migrations/` the database setup
- `docs/SETUP.md` how to set up Supabase and DigitalOcean

## Try it on your computer

```
cd public && python3 -m http.server 8000
```

Then open http://localhost:8000

## License

AGPL-3.0. See `LICENSE`.
