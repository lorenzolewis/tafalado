import { describe, expect, it } from 'vitest';
import { APPLE_PODCASTS_URL, feedTranscriptPath, feedVtt, podcastApps, transcriptPath, transcriptTag } from './podcast';

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

describe('transcriptTag', () => {
  const url = (path: string) => new URL(path, 'https://tafalado.lorenzo.soy').href;

  it('links the feed’s copy of the lesson’s WebVTT file on the site', () => {
    expect(transcriptPath('grammar-04')).toBe('/transcripts/grammar-04.vtt');
    expect(feedTranscriptPath('grammar-04')).toBe('/transcripts/feed/grammar-04.vtt');
    expect(transcriptTag('pronunciation-13', new Set(['pronunciation-13']), url)).toBe(
      '<podcast:transcript url="https://tafalado.lorenzo.soy/transcripts/feed/pronunciation-13.vtt" type="text/vtt"/>',
    );
  });

  it('adds nothing for a lesson without a transcript', () => {
    expect(transcriptTag('grammar-04', new Set(['pronunciation-13']), url)).toBe('');
  });
});

describe('feedVtt', () => {
  it('keeps cues and <v> speakers, drops NOTE blocks and <lang> spans but not their text', () => {
    const vtt = [
      'WEBVTT',
      '',
      'NOTE pronunciation-01. Machine draft.',
      '',
      '00:00:03.100 --> 00:00:07.550',
      '<v Orlando>Welcome to <lang pt-BR>Tá Falado</lang>, the Brazilian Portuguese',
      'pronunciation for speakers of Spanish.',
      '',
      '00:00:08.000 --> 00:00:09.000',
      '<v José Luis><lang es>Hola</lang>',
      '',
    ].join('\n');
    expect(feedVtt(vtt)).toBe(
      [
        'WEBVTT',
        '',
        '00:00:03.100 --> 00:00:07.550',
        '<v Orlando>Welcome to Tá Falado, the Brazilian Portuguese',
        'pronunciation for speakers of Spanish.',
        '',
        '00:00:08.000 --> 00:00:09.000',
        '<v José Luis>Hola',
        '',
      ].join('\n'),
    );
  });
});
