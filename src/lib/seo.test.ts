import { describe, expect, it } from 'vitest';
import { jsonLdScript, lessonDescription, podcastEpisodeLd, podcastSeriesLd } from './seo';

const site = new URL('https://tafalado.example');

describe('lessonDescription', () => {
  it('turns a short intro into plain text', () => {
    expect(lessonDescription('<p>Meet the team: <em>Orlando</em> &amp; <em>Valdo</em>.</p>\n')).toBe(
      'Meet the team: Orlando & Valdo.',
    );
  });

  it('cuts a long intro after the last whole sentence that fits in 160 characters', () => {
    const first = "There's only one Lesson #1. We'll never have a first again.";
    const second = 'Today we introduce listeners to the team: Orlando, Valdo, Michelle, and José Luis.';
    const third = 'Pronunciation wise, we will look at when Brazilians say words with the sound /i/.';
    expect(lessonDescription(`<p>${first} ${second} ${third}</p>`)).toBe(`${first} ${second}`);
  });

  it('fills up to 160 characters at a word when the sentences that fit are too short to describe the lesson', () => {
    const second = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const description = lessonDescription(`<p>Just look at that barriga! ${second}.</p>`);
    expect(description).toBe(
      `Just look at that barriga! ${Array.from({ length: 20 }, (_, i) => `word${i}`).join(' ')}…`,
    );
  });

  it('keeps a sentence that ends inside quotation marks', () => {
    const quote = '“Is it true that Portuguese sounds like Russian?”';
    const rest = 'That is what many people say the first time they hear Brazilian Portuguese spoken quickly.';
    const third = 'In this lesson, we look at the nasal vowels that might explain it, and why they matter.';
    expect(lessonDescription(`<p>${quote} ${rest} ${third}</p>`)).toBe(`${quote} ${rest}`);
  });

  it('cuts a long first sentence at a word, with an ellipsis', () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const description = lessonDescription(`<p>${words}.</p>`);
    expect(description).toBe(`${Array.from({ length: 24 }, (_, i) => `word${i}`).join(' ')}…`);
    expect(description.length).toBeLessThanOrEqual(160);
  });
});

describe('podcastEpisodeLd', () => {
  it('describes a lesson as a schema.org PodcastEpisode with absolute URLs', () => {
    const lesson = {
      series: 'grammar' as const,
      number: 1,
      episode: 27,
      title: 'Gostar vs. Gustar',
      date: new Date('2007-05-08'),
      audio: { url: '/mp3/tafalado_gra_01.mp3', durationSeconds: 649 },
    };
    expect(podcastEpisodeLd(lesson, 'We have made a switch.', site)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'PodcastEpisode',
      name: 'Grammar 1: Gostar vs. Gustar',
      description: 'We have made a switch.',
      url: 'https://tafalado.example/grammar/01',
      episodeNumber: 27,
      datePublished: '2007-05-08',
      duration: 'PT10M49S',
      image: 'https://tafalado.example/artwork/grammar-01.png',
      inLanguage: 'en',
      license: 'https://creativecommons.org/licenses/by/3.0/',
      associatedMedia: {
        '@type': 'AudioObject',
        contentUrl: 'https://tafalado.example/mp3/tafalado_gra_01.mp3',
        encodingFormat: 'audio/mpeg',
        duration: 'PT10M49S',
      },
      partOfSeries: { '@type': 'PodcastSeries', name: 'Tá Falado', url: 'https://tafalado.example/' },
    });
  });
});

describe('podcastSeriesLd', () => {
  it('describes the site as a schema.org PodcastSeries with its feed', () => {
    expect(podcastSeriesLd(site)).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'PodcastSeries',
      name: 'Tá Falado',
      url: 'https://tafalado.example/',
      webFeed: 'https://tafalado.example/feed.xml',
      image: 'https://tafalado.example/artwork/cover.png',
      inLanguage: 'en',
      license: 'https://creativecommons.org/licenses/by/3.0/',
      author: { '@type': 'Organization', name: 'COERLL, University of Texas at Austin' },
    });
  });

  it('links the show in the podcast apps that list it, and leaves sameAs out until one does', () => {
    expect(podcastSeriesLd(site, { apple: 'https://podcasts.apple.com/us/podcast/x/id1' }).sameAs).toEqual([
      'https://podcasts.apple.com/us/podcast/x/id1',
    ]);
    expect(podcastSeriesLd(site, {})).not.toHaveProperty('sameAs');
  });
});

describe('jsonLdScript', () => {
  it('serialises JSON that cannot close the script element it sits in', () => {
    const json = jsonLdScript({ name: 'a</script><script>alert(1)</script>' });
    expect(json).not.toMatch(/<\/script/i);
    expect(JSON.parse(json)).toEqual({ name: 'a</script><script>alert(1)</script>' });
  });
});
