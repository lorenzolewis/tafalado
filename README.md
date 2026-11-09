# Tá Falado

An independent, unofficial, mobile-friendly archive of *Tá Falado*, the Brazilian Portuguese podcast for speakers of Spanish originally published by COERLL at the University of Texas at Austin. It isn't affiliated with or endorsed by UT Austin or COERLL.

Static [Astro](https://astro.build/) on Cloudflare Workers.

```sh
pnpm install
pnpm dev
```

## Analytics

No cookies, no consent banner (#8, [research notes](docs/research/privacy-friendly-analytics.md)).

- **Page views per lesson:** Cloudflare Web Analytics, once `WEB_ANALYTICS_TOKEN` in `src/lib/analytics.ts` is set. Filter by path in the dashboard.
- **MP3 downloads per episode:** the Worker writes one row to the `tafalado_downloads` Analytics Engine dataset per whole-file fetch or range from byte 0, so counts are rough. Read them with an API token that has *Account Analytics Read*:

```sh
curl "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/analytics_engine/sql" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -d "SELECT blob1 AS episode, SUM(_sample_interval) AS downloads FROM tafalado_downloads WHERE timestamp > NOW() - INTERVAL '30' DAY GROUP BY episode ORDER BY episode"
```

## Build cache

`pnpm build` draws the podcast and episode artwork, which takes most of the build time. Astro's incremental build reuses unchanged images from `node_modules/.astro`, and the Workers Builds build cache (project Settings → Build → Build cache, enabled) keeps that folder between deploys. Without the cache the build still works; it just draws every image. Run `pnpm build --force` to redraw everything.

## License

- **Code:** MIT. See [`LICENSE`](LICENSE).
- **Content** (the lessons, audio, transcripts and photos): © University of Texas at Austin, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), modified: re-hosted and re-presented. See [`CREDITS.md`](CREDITS.md) for the full attribution and [`SOURCES.md`](SOURCES.md) for where it came from.
