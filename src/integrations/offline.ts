// Offline browsing (#9, ADR 0006): once the build is done, lists what to save on the device from
// dist/ and writes dist/sw.js from the template beside this file (./sw.js). The list is never kept
// by hand. The service worker is registered in production only (src/layouts/Base.astro).
//
// `SW_KILL_SWITCH=1 pnpm build` writes a sw.js that deletes every cache and unregisters itself
// instead, for when a deploy's service worker has to go (ADR 0006). It doesn't reload open tabs:
// pages register sw.js on every visit, so a reload would only run it again, in a loop.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

/** Saved: pages, transcript JSON, hashed build files, the manifest, icons and lesson photos. */
const SAVE = [
  /\.html$/,
  /^data\/transcripts\/[^/]+\.json$/,
  /^_astro\//,
  /^manifest\.webmanifest$/,
  /^icons\//,
  /^favicon\.ico$/,
  /^apple-touch-icon\.png$/,
  /^images\/lesson_pic_[^/]+\.jpg$/,
];
// Never saved, whatever SAVE says: audio, captions, the feed, artwork, sitemaps, robots.txt.
const NEVER = [/^mp3\//, /^transcripts\//, /^feed\.xml$/, /^artwork\//, /^sitemap/, /^robots\.txt$/, /^sw\.js$/];

const KILL_SWITCH = `// Kill switch (ADR 0006): forget everything this site saved and step aside.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) await caches.delete(name);
    await self.registration.unregister();
  })());
});
`;

/** `grammar/01.html` → `/grammar/01`, `index.html` → `/`: the URLs the site is served at. */
function urlOf(file: string): string {
  if (!file.endsWith('.html')) return `/${file}`;
  const page = file.slice(0, -'.html'.length);
  return page === 'index' ? '/' : `/${page.replace(/\/index$/, '')}`;
}

export function offline(): AstroIntegration {
  return {
    name: 'tafalado:offline',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const target = new URL('sw.js', dir);
        if (process.env.SW_KILL_SWITCH) {
          await writeFile(target, KILL_SWITCH);
          logger.warn('wrote the service worker kill switch');
          return;
        }
        const files = (await readdir(root, { recursive: true, withFileTypes: true }))
          .filter((entry) => entry.isFile())
          .map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join('/'))
          .filter((file) => SAVE.some((re) => re.test(file)) && !NEVER.some((re) => re.test(file)))
          .sort();
        const template = await readFile(new URL('./sw.js', import.meta.url), 'utf8');
        // The cache name hashes everything saved and the worker itself, so any change is a new cache.
        const hash = createHash('sha256').update(template);
        let bytes = 0;
        for (const file of files) {
          const content = await readFile(new URL(file, dir));
          bytes += content.length;
          hash.update(file).update(content);
        }
        const cache = `tafalado-${hash.digest('hex').slice(0, 12)}`;
        const source = template
          .replace("'__CACHE__'", JSON.stringify(cache))
          .replace('/* PRECACHE */ []', JSON.stringify(files.map(urlOf)));
        await writeFile(target, source);
        logger.info(`sw.js: ${files.length} files saved for offline, ${(bytes / 1e6).toFixed(1)} MB (${cache})`);
      },
    },
  };
}
