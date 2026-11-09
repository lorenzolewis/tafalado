---
status: accepted
---

# Serve media as Workers static assets committed to git, not from R2

The 46 MP3s (3.7–11.6 MB each), PDFs and photos (about 350 MB in total, each under 25 MiB) are committed to the repo and deployed as Cloudflare Workers static assets, rather than stored in R2 or Git LFS. They never change, static-asset requests are free, and one deploy keeps site and media in sync. `.gitattributes` marks them `binary`.

Static assets ignore `Range` and always return `200` with the whole file ([documented](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), confirmed by the spike in #2). Safari on iOS 27 still plays and seeks by downloading everything, but Apple Podcasts requires byte-range support for the feed. So the MP3 path goes through a small Worker (`assets.run_worker_first`) that fetches the file with `env.ASSETS.fetch()` and answers single ranges with `206`/`416`. The cost is a Worker invocation per MP3 request and buffering the file (at most 11.6 MB) per ranged request. `wrangler dev` has no byte serving of its own, so test ranges against the Worker, not the asset server. The edge drops `Content-Length` on `HEAD`; the size is still in `Content-Range` and the feed's enclosure `length`. We chose this over R2, which serves ranges natively but adds a bucket, a separate upload and a custom domain. Revisit if static assets gain native Range support.

**2026-11-09:** the PDFs were removed in #91, once their dialogs and notes were in each lesson's page (see [`SOURCES.md`](../../SOURCES.md)). The MP3s and photos are still served this way.
