import type { APIRoute } from 'astro';
import { manifestIconPath, MANIFEST_ICONS } from '../lib/artwork';
import { DEFAULT_PAPER } from '../lib/print';
import { PODCAST_TITLE } from '../lib/podcast';
import { SITE_DESCRIPTION, THEME_COLOUR } from '../lib/seo';

// The web app manifest: what the site is called and looks like once it's added to a home screen
// or installed. It opens standalone, with no browser bar, so it feels like an app; the player keeps
// playing across pages there just as in the browser (ADR 0001), and its pages open offline too
// (dist/sw.js, ADR 0006). The splash screen (Android) is the icon on its own paper.
export const GET: APIRoute = () => {
  const manifest = {
    id: '/',
    name: PODCAST_TITLE,
    short_name: PODCAST_TITLE,
    description: SITE_DESCRIPTION,
    lang: 'en',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: DEFAULT_PAPER,
    theme_color: THEME_COLOUR.light,
    categories: ['education', 'podcasts'],
    icons: MANIFEST_ICONS.map((icon) => ({
      src: manifestIconPath(icon),
      sizes: `${icon.size}x${icon.size}`,
      type: 'image/png',
      purpose: icon.maskable ? 'maskable' : 'any',
    })),
  };
  return new Response(JSON.stringify(manifest, null, 2), { headers: { 'Content-Type': 'application/manifest+json' } });
};
