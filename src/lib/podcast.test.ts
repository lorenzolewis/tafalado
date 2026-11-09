import { describe, expect, it } from 'vitest';
import { APPLE_PODCASTS_URL, podcastApps } from './podcast';

const FEED = 'https://tafalado.lorenzo.soy/feed.xml';
const linked = (apps: ReturnType<typeof podcastApps>) => apps.filter((app) => app.href).map((app) => app.name);

describe('podcastApps', () => {
  it('lists every app, linking only those that follow from the feed until the show URLs are filled in', () => {
    const apps = podcastApps(FEED, {});
    expect(apps.map((app) => app.name)).toEqual([
      'Apple Podcasts',
      'Overcast',
      'Pocket Casts',
      'Castro',
      'AntennaPod',
    ]);
    expect(linked(apps)).toEqual(['Pocket Casts', 'AntennaPod']);
    expect(apps.find((app) => app.name === 'Pocket Casts')?.href).toBe(
      'https://pocketcasts.com/follow/https%3A%2F%2Ftafalado.lorenzo.soy%2Ffeed.xml',
    );
    expect(apps.find((app) => app.name === 'AntennaPod')?.href).toBe(
      'https://antennapod.org/deeplink/subscribe?url=https%3A%2F%2Ftafalado.lorenzo.soy%2Ffeed.xml&title=T%C3%A1%20Falado',
    );
    expect(apps.find((app) => app.name === 'Overcast')?.icon).toBe('/images/apps/overcast.png');
  });

  it('builds the Overcast and Castro links from the Apple Podcasts ID', () => {
    const apps = podcastApps(FEED, { apple: 'https://podcasts.apple.com/us/podcast/ta-falado/id123456789' });
    expect(linked(apps)).toEqual(['Apple Podcasts', 'Overcast', 'Pocket Casts', 'Castro', 'AntennaPod']);
    expect(linked(apps)).toHaveLength(apps.length);
    expect(apps.find((app) => app.name === 'Overcast')?.href).toBe('https://overcast.fm/itunes123456789');
    expect(apps.find((app) => app.name === 'Castro')?.href).toBe('https://castro.fm/itunes/123456789');
  });

  it('links Apple Podcasts, Overcast and Castro from the published Apple listing', () => {
    expect(APPLE_PODCASTS_URL).toMatch(/^https:\/\/podcasts\.apple\.com\/us\/podcast\/[^?]+\/id6831601239$/);
    const apps = podcastApps(FEED);
    expect(apps.find((app) => app.name === 'Overcast')?.href).toBe('https://overcast.fm/itunes6831601239');
    expect(apps.find((app) => app.name === 'Castro')?.href).toBe('https://castro.fm/itunes/6831601239');
  });
});
