# Privacy-friendly analytics (issue #8)

Researched 2026-11-09 against Cloudflare's docs and blog, OP3's own pages and the IAB Tech Lab guidelines. "Unverified" means no primary source confirmed it.

## Summary and recommendation

Two small pieces, both on Cloudflare, both free, nothing to host:

1. **Page views: Cloudflare Web Analytics with the manual JS snippet.** One `<script>` tag in `src/layouts/Base.astro`. It sets no cookies, tracks `pushState` navigations, so it works with the ClientRouter (ADR 0001), and the dashboard filters by path. In the Web Analytics settings for `tafalado.lorenzo.soy`, don't keep the default that excludes EU visitors: the audience is Spanish speakers.
2. **MP3 downloads: one `writeDataPoint()` call in the existing Worker, into Workers Analytics Engine.** Every `/mp3/*` request already runs `worker/index.ts` (`run_worker_first`). Add an `analytics_engine_datasets` binding and record a data point only for requests with no `Range` or a range starting at byte 0, so the count is roughly one per download rather than one per chunk. Read the counts with one saved SQL `curl`. Data is kept 3 months, and the service isn't billed today.

**Plays** aren't worth measuring. Podcast apps don't report them to the server, and Web Analytics has no custom events. Treat downloads as the proxy.

**Zero-code fallback for downloads:** add `"observability": { "enabled": true }` to `wrangler.jsonc` and group `/mp3/*` requests by path in the Workers Logs Query Builder. That's a config toggle, but you only get the last few days, and ranged chunks are overcounted.

**Third-party alternative:** OP3 (`https://op3.dev/e/` prefixed to enclosure URLs in the feed). No code beyond the feed template, and you get proper deduplicated download stats and full history. The cost: a third party in every podcast download (it sees listener IPs, hashed), the stats page is public, and in-page player plays aren't counted.

## How MP3 requests reach Cloudflare

- `tafalado.lorenzo.soy` is a Workers **custom domain** (`routes[].custom_domain` in `wrangler.jsonc`), so requests go through the Cloudflare zone for `lorenzo.soy`, with the Worker as origin ([Custom Domains for Workers](https://blog.cloudflare.com/custom-domains-for-workers/)).
- By default an asset match is served without invoking the Worker. Paths listed in `run_worker_first` "always invoke your Worker script" ([billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Worker script routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)).
- So **every `/mp3/*` request, ranged or not, invokes `worker/index.ts`**. Anything the Worker logs or writes covers all MP3 traffic, while HTML pages are never seen by the Worker. MP3 requests are already billed as Worker requests, and asset requests are free ([same page](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)), so counting in the Worker adds no requests.

## Cloudflare Web Analytics (page views)

- **Setup.** Proxied sites can use automatic injection, and other sites add the JS snippet "before the ending body tag" ([get started](https://developers.cloudflare.com/web-analytics/get-started/)). Since 15 Oct 2025, free zones get it on by default, in a version that "excludes data from EU visitors" ([blog](https://blog.cloudflare.com/the-rum-diaries-enabling-web-analytics-by-default/)).
  - Workers sites aren't mentioned. *Unverified:* whether automatic injection rewrites HTML that Workers static assets serve on a custom domain. The manual snippet removes that doubt.
  - Automatic injection is also skipped if a response has `Cache-Control: public, no-transform` ([get started](https://developers.cloudflare.com/web-analytics/get-started/)).
  - *Unverified:* whether automatic plus manual double-counts. Switch the hostname to "Enable with JS Snippet installation" when adding the tag.
- **Cookies and consent.** "We don't use any client-side state (like cookies or localStorage) for analytics purposes" ([launch blog](https://blog.cloudflare.com/privacy-first-web-analytics/)). It "does not collect or use your visitors' personal data" ([about](https://developers.cloudflare.com/web-analytics/about/)). Cloudflare doesn't state outright that no consent banner is needed, so that part is an inference from the no-cookies statement, not legal advice.
- **Per-path page views.** A page view is "a successful HTTP response with a content-type of HTML" ([high-level metrics](https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/)). Filters include Host, Path, Referer, Country, Device and an Exclude Bots toggle ([dimensions](https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/)). *Unverified:* the docs word "Path" oddly ("the links within your site referring visits to a page"), so confirm in the dashboard that it shows views per lesson.
- **SPA and ClientRouter.** It tracks route changes automatically through the Soft Navigations API, Navigation API `navigate` events, or by "patching the History API's `pushState`" ([SPA page](https://developers.cloudflare.com/web-analytics/get-started/web-analytics-spa/)). Astro's ClientRouter navigates with the History API, so lesson-to-lesson navigations should count. Confirm after deploying. The FAQ warns that "there can be data loss" when the beacon sends ([FAQ](https://developers.cloudflare.com/web-analytics/faq/)).
- **Retention.** Unsampled for 7 days, then aggregated to about 10%, with six months viewable ([FAQ](https://developers.cloudflare.com/web-analytics/faq/)).
- **Limits.** Soft limit of 10 sites per account. No custom events: "Not yet" ([FAQ](https://developers.cloudflare.com/web-analytics/faq/)).

## MP3 download counting options

| Option | Effort | Retention | Cost | Sees MP3 requests? |
|---|---|---|---|---|
| Workers Analytics Engine | Binding plus about 5 lines in `worker/index.ts`. Read through the SQL API | 3 months | Free plan: 100k writes and 10k reads a day. "Currently, you will not be billed" | Yes, the Worker runs for every MP3 |
| Workers Logs plus Query Builder | Config toggle, zero code | Free 3 days, paid 7 (sources disagree) | Free 200k events a day | Yes, invocation logs include the path |
| Zone HTTP analytics / GraphQL `httpRequestsAdaptiveGroups` | Zero code, but queried by API | At least 31 days | Path breakdown may need Pro | *Unverified* on the free plan |
| OP3 prefix | Feed template change | Full history | Free (sponsor-funded) | Only app downloads through the feed |

- **Analytics Engine.**
  - **Setup:** declare an `analytics_engine_datasets` binding. The dataset is created on the first write. `writeDataPoint({ blobs, doubles, indexes })` doesn't need to be awaited. Query by POSTing SQL to `/accounts/{account_id}/analytics_engine/sql` with an "Account Analytics Read" token ([get started](https://developers.cloudflare.com/analytics/analytics-engine/get-started/)).
  - **Limits and price:** data is "stored for three months", up to 20 blobs per data point ([limits](https://developers.cloudflare.com/analytics/analytics-engine/limits/)). On the free plan, 100k data points a day are included and use isn't billed today ([pricing](https://developers.cloudflare.com/analytics/analytics-engine/pricing/)).
  - **What to record:** suggested blobs are path, a range flag and the user agent family. An episode can then be grouped by path and filtered to rows with the range flag set to start.
- **Workers Logs.**
  - **Setup:** enable with `observability.enabled` (newly created Workers have it on by default; this repo's `wrangler.jsonc` doesn't set it).
  - **Limits:** the free plan includes 200,000 events a day with 3-day retention. Paid gets 7 days and 20M events a month, then $0.60 per million. Pricing changes on 1 Dec 2026 ([Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)).
  - **Query Builder:** can Group By `$workers.event.request.path`. Its page says logs are kept "seven days", which conflicts with the 3-day free figure above ([Query Builder](https://developers.cloudflare.com/workers/observability/query-builder/)).
  - *Unverified:* whether the `Range` header can be filtered without the Worker logging it itself. A `console.log` would fix that, but at that point Analytics Engine is the better place to write.
- **Zone and GraphQL analytics.**
  - `httpRequestsAdaptiveGroups` can group by `clientRequestPath` and powers the dashboard's Traffic page ([zone analytics migration](https://developers.cloudflare.com/analytics/graphql-api/migration-guides/zone-analytics/)). Adaptive datasets keep "at least 31 days" ([limits](https://developers.cloudflare.com/analytics/graphql-api/limits/)).
  - The Web Analytics FAQ says a URL breakdown of traffic is a Pro+ feature ([FAQ](https://developers.cloudflare.com/web-analytics/faq/)).
  - *Unverified:* whether a free zone can query by path, and whether Worker custom domain traffic appears there.

## Range requests: a rough approximation

- **Why raw counts mislead.** Apps fetch MP3s in byte-range chunks, so raw request counts overstate downloads.
- **What IAB counts.** The IAB guidelines count unique downloads by IP plus user agent within a 24-hour window, rolling or fixed ([IAB Tech Lab guidelines](https://iabtechlab.com/standards/podcast-measurement-guidelines/), [v2.2 PDF](https://iabtechlab.com/wp-content/uploads/2024/02/PodcastMeasurement_v2.2_final.pdf); v2.3 is in public comment).
- **The rough approximation.** Count only `GET` requests with no `Range`, or with `Range: bytes=0-…`. Each fetch starts there once, and seeks and resumes start later in the file. *Unverified:* some clients probe with `bytes=0-1` before the real download, which would count twice. Excluding ranges whose end is below about 1 KB handles that cheaply.
- **Don't do IAB-grade dedup.** It needs storing IPs, which is against the spirit of the issue and over-engineered here.

## Plays vs downloads

- **Podcast apps.** The server only sees the downloads they make, not plays. Nothing simple measures app plays.
- **In-page player.** Web Analytics can't record an event ("Not yet", [FAQ](https://developers.cloudflare.com/web-analytics/faq/)). The player streams `/mp3/*` through the same Worker, so its first `bytes=0-` request is already counted as a download, which is a good enough "play" signal.
- **A separate play beacon isn't worth it.** It would need a new endpoint and client code.

## OP3 (non-Cloudflare, simplest for "proper" podcast stats)

- **Setup.** Prefix each enclosure URL in the feed, for example `https://op3.dev/e/tafalado.lorenzo.soy/mp3/tafalado_01.mp3`. Optionally add `pg=<podcast guid>` (`https://op3.dev/e,pg=<guid>/…`) so the show is attributed faster. "No signup or login required" ([home](https://op3.dev/), [setup](https://op3.dev/setup)).
- **What you get.** A free, public stats page per show, an API and exports ([home](https://op3.dev/)).
- **Privacy.** IPs are hashed and encrypted with keys rotated monthly, and never joined with outside data ([privacy](https://op3.dev/privacy)). Retention isn't stated.
- **Unverified.** How OP3 handles dedup and ranges (its FAQ URL returned 404), and its redirect status code.
- **Trade-off.** A third-party hop in every download, public numbers, and it doesn't see the in-page player.

## Rejected as over-complicated

- **Self-hosted analytics (Plausible, Umami, Matomo, GoatCounter on our own server).** They need a server and a database to run.
- **Logpush or R2 log pipelines.** Logpush needs a paid plan (unverified here), plus storage and a parser. All of that just to count 46 files.
- **IAB-compliant dedup** (storing IP and user agent per 24 h in KV or D1). It needs a database and personal data for a "rough" count.
- **A play-event beacon endpoint** for the in-page player. It duplicates what the `bytes=0-` download count already shows.
- **Moving MP3s to R2 for its metrics.** That reverses ADR 0002 for no counting benefit, since the Worker already sees every request.
- **Paid podcast hosts with analytics.** That's a new paid service and moves the media out of git.
