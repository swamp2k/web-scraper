# Web Scraper

Small Cloudflare Worker that normalizes search listings from supported sites behind one API.

Supported adapters:

- `bilbasen.dk` — Cloudflare Browser Run Quick Action reads rendered `__NEXT_DATA__`.
- `123mc.dk` — plain HTTP fetch + server-rendered HTML parsing.

## API

`GET /api/scrape?url=<search-url>&maxPages=10`

Returns a generic `Listing[]` model. Only explicitly supported HTTPS hosts are accepted, so the Worker cannot be used as an open proxy.

## Development

```bash
npm install
npm run check
npm run dev
```

`npm run check` regenerates Cloudflare binding types, runs the TypeScript check, and performs a Wrangler dry run.

`npm run dev` uses remote Browser Run because `quickAction()` requires a remote browser binding during local development.

## Design

Keep it simple: one small adapter per site. Add abstractions only after multiple adapters prove they are useful.
