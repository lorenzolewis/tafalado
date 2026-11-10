// The service worker (#9, ADR 0006). This is a template: src/integrations/offline.ts fills in CACHE
// and PRECACHE at build time and writes the result to dist/sw.js. Audio never passes through it.

/** One cache per build: a new deploy changes this name, so `sw.js` changes and the browser updates. */
const CACHE = '__CACHE__';
/** Every page, transcript JSON, /_astro/* file, icon and lesson photo, listed from dist/. */
const PRECACHE = /* PRECACHE */ [];
const NOT_FOUND = '/404';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // `reload` skips the HTTP cache, so the saved copies are this deploy's.
      await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name !== CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  // MP3s and their byte ranges go straight to the range Worker (ADR 0002), untouched.
  if (url.pathname.startsWith('/mp3/') || request.headers.has('range')) return;

  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith('/data/transcripts/')) {
    event.respondWith(networkFirst(request));
  } else if (isPage(url.pathname)) {
    // Full loads and the ClientRouter's fetches of page HTML (ADR 0001) alike.
    event.respondWith(networkFirst(request, url.pathname).then((response) => response ?? notFound()));
  }
  // Everything else (the feed, .vtt, artwork, sitemaps…) is the network's alone.
});

/** Pages have no extension (`build.format: 'file'`, `trailingSlash: 'never'`): `/`, `/grammar/01`. */
function isPage(pathname) {
  return !pathname.slice(pathname.lastIndexOf('/') + 1).includes('.');
}

/** The network's answer; offline, the saved copy (or, for a page, undefined so it gets the 404). */
async function networkFirst(request, pathname) {
  try {
    return await fetch(request);
  } catch (error) {
    const cached = await caches.match(pathname ?? request.url, { cacheName: CACHE, ignoreSearch: true });
    if (cached) return cached;
    if (pathname !== undefined) return undefined;
    throw error;
  }
}

/** Hashed build files never change, so the saved copy is always right. */
async function cacheFirst(request) {
  const cached = await caches.match(request, { cacheName: CACHE });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

/** The saved 404 page, with its status, for a page that was never saved. */
async function notFound() {
  const cached = await caches.match(NOT_FOUND, { cacheName: CACHE });
  if (!cached) return Response.error();
  return new Response(cached.body, { status: 404, statusText: 'Not Found', headers: cached.headers });
}
