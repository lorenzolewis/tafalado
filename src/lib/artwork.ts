import type { Series } from './series';

// Where the generated artwork lives (#17). src/pages/artwork/ builds the files at these paths,
// and the feed and pages link them. Keep the paths stable: apps cache artwork by URL.
// Safe to import in the browser; the renderer is in ./artwork-render.

type LessonRef = { series: Series; number: number };

/** The podcast cover's file name, beside the episode covers (never a lesson's `series-NN`). */
export const PODCAST_COVER_SLUG = 'cover';
/** The podcast cover: 3000×3000, Apple's maximum. */
export const COVER_SIZE = 3000;

/** The podcast cover (3000×3000, RGB, no transparency). */
export const PODCAST_COVER_PATH = `/artwork/${PODCAST_COVER_SLUG}.png`;

/** Episode covers: 1400×1400, Apple's minimum, which keeps 46 of them quick to build. */
export const EPISODE_COVER_SIZE = 1400;

/** One cover per episode, for `itunes:image` and Media Session: `/artwork/pronunciation-01.png`. */
export function episodeCoverPath(lesson: LessonRef): string {
  return `/artwork/${artworkSlug(lesson)}.png`;
}

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** The Open Graph image of a lesson page (1200×630): `/artwork/og/pronunciation-01.png`. */
export function ogImagePath(lesson: LessonRef): string {
  return `/artwork/og/${artworkSlug(lesson)}.png`;
}

/** The site's own Open Graph image's file name, beside the lessons' (never a lesson's `series-NN`). */
export const SITE_OG_SLUG = 'site';

/** The Open Graph image of every page that isn't a lesson (1200×630): the home page and the 404. */
export const SITE_OG_PATH = `/artwork/og/${SITE_OG_SLUG}.png`;

/** `pronunciation-01`: the file name both per-lesson images share. */
export function artworkSlug({ series, number }: LessonRef): string {
  return `${series}-${String(number).padStart(2, '0')}`;
}

// The app icons (favicon, home screen, the web app manifest): "Tá" in ink on the amarelo paper.
// src/pages/ builds them; src/layouts/Base.astro and src/pages/manifest.webmanifest.ts link them.

/** The browser tab icon: an ICO holding 16, 32 and 48px PNGs. Browsers also ask for it unlinked. */
export const FAVICON_PATH = '/favicon.ico';
export const FAVICON_SIZES = [16, 32, 48] as const;

/** The iPhone and iPad home screen icon: 180×180, opaque; iOS rounds the corners itself. */
export const APPLE_TOUCH_ICON_PATH = '/apple-touch-icon.png';
export const APPLE_TOUCH_ICON_SIZE = 180;

/** One of the web app manifest's icons. A maskable one keeps "Tá" inside the central safe zone. */
export interface ManifestIcon {
  slug: string;
  size: number;
  maskable: boolean;
}

/** The manifest's icons, at /icons/<slug>.png: Android's home screen, install prompts, splash screens. */
export const MANIFEST_ICONS: readonly ManifestIcon[] = [
  { slug: 'icon-192', size: 192, maskable: false },
  { slug: 'icon-512', size: 512, maskable: false },
  { slug: 'icon-maskable-512', size: 512, maskable: true },
];

export function manifestIconPath({ slug }: ManifestIcon): string {
  return `/icons/${slug}.png`;
}
