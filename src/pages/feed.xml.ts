import type { APIRoute } from 'astro';
import { episodeCoverPath, PODCAST_COVER_PATH } from '../lib/artwork';
import { dialogHtml, notesLinkText } from '../lib/feed-notes';
import { getLessons, lessonPath, shortTitle, type Lesson } from '../lib/lessons';
import { getAllNotes, type LessonNotes } from '../lib/notes';
import { LICENSE_URL, PODCAST_AUTHOR, PODCAST_DESCRIPTION, PODCAST_TITLE } from '../lib/podcast';
import { SERIES_LABEL } from '../lib/series';

// The podcast feed (ADR 0003): one serial feed, the series named in each title, no seasons.
// Absolute URLs come from Astro's `site` (astro.config.ts), never from a host written here.
// `scripts/validate-feed.ts` checks the built file in CI.

const CREDIT =
  'Original lesson by the Tá Falado team at the University of Texas at Austin, published by COERLL. ' +
  `© 2025, University of Texas at Austin, licensed <a href="${LICENSE_URL}">CC BY 3.0</a>. ` +
  'Re-hosted unchanged by an independent, unofficial archive.';

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('Set `site` in astro.config.ts: the feed needs absolute URLs.');
  const url = (path: string) => new URL(path, site).href;
  const [lessons, notes] = await Promise.all([getLessons(), getAllNotes()]);

  const items = lessons.map((lesson) => item(lesson, notes.get(lesson.id), url)).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:podcast="https://podcastindex.org/namespace/1.0"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(PODCAST_TITLE)}</title>
    <link>${url('/')}</link>
    <atom:link href="${url('/feed.xml')}" rel="self" type="application/rss+xml"/>
    <description>${escape(PODCAST_DESCRIPTION)}</description>
    <language>en</language>
    <copyright>© 2025, University of Texas at Austin. Licensed CC BY 3.0 (${LICENSE_URL}).</copyright>
    <itunes:type>serial</itunes:type>
    <itunes:author>${escape(PODCAST_AUTHOR)}</itunes:author>
    <itunes:explicit>false</itunes:explicit>
    <itunes:image href="${url(PODCAST_COVER_PATH)}"/>
    <itunes:category text="Education">
      <itunes:category text="Language Learning"/>
    </itunes:category>
    <podcast:license url="${LICENSE_URL}">cc-by-3.0</podcast:license>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};

/**
 * The episode notes: the intro, then the dialog (#90; Pronunciation 24's clips stay on the lesson
 * page), a link to the page's cultural and pronunciation or grammar notes, and the credit. No notes
 * tables: podcast apps show only basic HTML, and many cut notes off past about 4,000 characters.
 */
function item(lesson: Lesson, notes: LessonNotes | undefined, url: (path: string) => string): string {
  const { data } = lesson;
  const page = url(lessonPath(data));
  const number = String(data.number).padStart(2, '0');
  // TODO(#89): every lesson has notes once they're all written; until then the page keeps the PDF.
  const linkText = notes ? notesLinkText(data.series) : 'Lesson page, with the transcript';
  const description = [
    lesson.rendered?.html ?? '',
    notes?.dialog ? dialogHtml(notes.dialog) : '',
    `<p><a href="${page}">${linkText}</a></p>`,
    `<p>${CREDIT}</p>`,
  ]
    .filter(Boolean)
    .join('\n');
  return `    <item>
      <title>${escape(episodeTitle(lesson))}</title>
      <link>${page}</link>
      <guid isPermaLink="false">tafalado-${data.series}-${number}</guid>
      <pubDate>${data.date.toUTCString()}</pubDate>
      <description>${cdata(description)}</description>
      <enclosure url="${escape(url(data.audio.url))}" length="${data.audio.bytes}" type="audio/mpeg"/>
      <itunes:duration>${data.audio.durationSeconds}</itunes:duration>
      <itunes:episode>${data.episode}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:explicit>false</itunes:explicit>
      <itunes:image href="${url(episodeCoverPath(data))}"/>
    </item>`;
}

/**
 * "Pronunciation 1 · /i/, Getting the Check at a Restaurant", "Grammar 4 · Future Subjunctive, …".
 * Pronunciation titles drop their "Pronunciation of" because the series label already says it.
 */
function episodeTitle({ data }: Lesson): string {
  return `${SERIES_LABEL[data.series]} ${data.number} · ${shortTitle(data)}${data.topic ? `, ${data.topic}` : ''}`;
}

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cdata(text: string): string {
  return `<![CDATA[${text.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
}
