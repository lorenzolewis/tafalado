// What the feed (src/pages/feed.xml.ts) and the pages' structured data (./seo) both say about the podcast.

export const PODCAST_TITLE = 'Tá Falado';

export const LICENSE_URL = 'https://creativecommons.org/licenses/by/3.0/';

export const PODCAST_DESCRIPTION =
  'Tá Falado is a podcast of Brazilian Portuguese pronunciation and grammar for speakers of Spanish: ' +
  '24 pronunciation lessons, 2 supplementary lessons and 20 grammar lessons, each with a cultural ' +
  'conversation, recorded in 2006–2007 by a team at the University of Texas at Austin and published by ' +
  'COERLL under CC BY 3.0. This is an independent, unofficial archive of the original podcast. ' +
  "It isn't affiliated with or endorsed by the University of Texas at Austin or COERLL.";

export const PODCAST_AUTHOR = 'COERLL, University of Texas at Austin';

// Where to follow the podcast (the home page's "Follow the podcast" section). Pocket Casts and
// AntennaPod subscribe straight from the feed URL; Apple Podcasts lists the show, and Overcast and
// Castro find it through its Apple Podcasts ID. Spotify and YouTube Music aren't offered: they list a
// show only once its owner submits the feed, and it hasn't been submitted to them (issue #50).

/** podcasts.apple.com/…/id<number>, from Apple Podcasts Connect. Overcast's and Castro's links come from its ID. */
export const APPLE_PODCASTS_URL: string | undefined = 'https://podcasts.apple.com/us/podcast/t%C3%A1-falado/id6831601239';

export interface PodcastApp {
  name: string;
  /** The app's own icon, in public/images/apps/ (from its App Store listing, or AntennaPod's branding repo). */
  icon: string;
  /** Opens (or follows) the show in the app; undefined until the show is listed there. */
  href: string | undefined;
}

type ShowUrl = 'apple';

export const SHOW_URLS: Partial<Record<ShowUrl, string>> = {
  apple: APPLE_PODCASTS_URL,
};

/** Every app to offer, in order; `feed` is the feed's absolute URL. */
export function podcastApps(feed: string, show: Partial<Record<ShowUrl, string>> = SHOW_URLS): PodcastApp[] {
  const feedParam = encodeURIComponent(feed);
  const appleId = show.apple?.match(/\/id(\d+)/)?.[1];
  const app = (name: string, slug: string, href: string | undefined): PodcastApp => ({
    name,
    icon: `/images/apps/${slug}.png`,
    href,
  });
  return [
    app('Apple Podcasts', 'apple-podcasts', show.apple),
    // Overcast's and Castro's web links take the Apple Podcasts ID (overcast.fm/podcasterinfo,
    // castro.fm/blog/a-podcast-url-scheme).
    app('Overcast', 'overcast', appleId && `https://overcast.fm/itunes${appleId}`),
    // Follow links work from the feed alone (support.pocketcasts.com, antennapod.org/documentation).
    app('Pocket Casts', 'pocket-casts', `https://pocketcasts.com/follow/${feedParam}`),
    // Castro's link takes the Apple Podcasts ID too.
    app('Castro', 'castro', appleId && `https://castro.fm/itunes/${appleId}`),
    app(
      'AntennaPod',
      'antennapod',
      `https://antennapod.org/deeplink/subscribe?url=${feedParam}&title=${encodeURIComponent(PODCAST_TITLE)}`,
    ),
  ];
}
