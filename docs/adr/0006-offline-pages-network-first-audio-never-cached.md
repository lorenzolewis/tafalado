---
status: accepted
---

# Offline browsing: a hand-written service worker, network-first pages, audio never cached

Learners study with patchy or no signal, so the site saves itself on the device on the first visit (#9). A small hand-written service worker (`src/integrations/sw.js`, no Workbox) is written to `dist/sw.js` by an Astro integration (`src/integrations/offline.ts`) once the build is done. The integration lists what to save from `dist/`, never by hand: every page (including the 404), the transcript JSON, all of `/_astro/*`, the manifest, the icons and the lesson photos, about 8 MB uncompressed on the device. It never saves the MP3s, `.vtt` captions, the feed, the artwork, sitemaps or `robots.txt`. The service worker is registered after load, in production builds only (`src/layouts/Base.astro`), so `astro dev` has none.

Answers by request:

- **`/mp3/*` and any request with a `Range` header:** no `respondWith` at all, so the byte-range Worker (ADR 0002) answers exactly as before.
- **Pages,** whether a full load or the ClientRouter's `fetch` of the next page (ADR 0001): network first, so an online learner always gets the newest deploy; offline, the saved copy, else the saved 404 page with status `404`. The network's answers are not written back, so a cache only ever holds one build.
- **Transcript JSON:** network first, then the saved copy.
- **`/_astro/*`:** cache first; the names are content hashes, so a saved copy is never stale.
- **Everything else:** the network's alone.

The cache's name is a hash of everything saved plus the worker's own source, so each deploy that changes anything changes `sw.js`. Install saves the list and calls `skipWaiting`; activate deletes every other cache and calls `clients.claim`, so a new deploy takes over on the next load with no prompt. Cloudflare serves `/sw.js` with `max-age=0, must-revalidate`, so no `_headers` rule is needed.

The player learns about the connection from `navigator.onLine` and says "You're offline. Audio needs a connection." instead of an error. Offline, Play does nothing unless audio is already buffered; back online, audio that failed or stalled loads again where it was, paused.

Downloading audio for offline listening is ruled out for now: the 46 MP3s are about 360 MB, the range Worker would need a cached counterpart, and podcast apps already do it. Revisit if learners ask.

**Kill switch:** if a deployed service worker misbehaves, build with `SW_KILL_SWITCH=1 pnpm build` and deploy. That `sw.js` deletes every cache and unregisters itself, so the next page load goes straight to the network (pages keep registering it, and it keeps stepping aside). The next normal deploy brings the regular one back.
