// Validates the built podcast feed (dist/feed.xml): well-formed XML, the RSS 2.0 required
// elements, Apple's required iTunes tags, ADR 0003, the permanent feed URL, and every
// enclosure length against the file on disk, the dialog in each episode's notes (#90) against
// src/content/notes/, and each episode's transcript (docs/transcripts.md). Run after `pnpm build`: `pnpm validate:feed`. Exits non-zero on any error.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { parse as parseYaml } from 'yaml';
import { checkDescription } from '../src/lib/feed-notes.ts';
import { resolveDialog, type NotesFile } from '../src/lib/notes-check.ts';
import { notesSchema } from '../src/lib/notes-schema.ts';
import { TRANSCRIPT_TYPE, transcriptPath } from '../src/lib/podcast.ts';
import { checkTranscript } from '../src/lib/transcript-check.ts';

const DIST = new URL('../dist/', import.meta.url);
const EPISODES = 46;
const FEED_URL = 'https://tafalado.lorenzo.soy/feed.xml';

const NOTES = new URL('../src/content/notes/', import.meta.url);

const xml = readFileSync(new URL('feed.xml', DIST), 'utf8');
const errors: string[] = [];
const fail = (message: string) => errors.push(message);
const warnings: string[] = [];

// Each lesson's dialog, by lesson id (`pronunciation-01`), from the notes' frontmatter, parsed with
// the collection's own schema (Astro's loader needs the Astro runtime, so the files are read here).
// Undefined for a lesson whose notes have no `dialog`, whose item must then hold none.
const notesFiles: NotesFile[] = readdirSync(NOTES)
  .filter((file) => file.endsWith('.md'))
  .map((file) => {
    const frontmatter = readFileSync(new URL(file, NOTES), 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    const parsed = notesSchema.safeParse(parseYaml(frontmatter));
    if (!parsed.success) {
      console.error(`✗ src/content/notes/${file}: ${parsed.error.message}`);
      process.exit(1);
    }
    return { id: file.replace(/\.md$/, ''), data: parsed.data };
  });
const notesById = new Map(notesFiles.map((notes) => [notes.id, notes]));
const dialogs = new Map(notesFiles.map((notes) => [notes.id, resolveDialog(notes, notesById)]));

const wellFormed = XMLValidator.validate(xml);
if (wellFormed !== true) {
  console.error(`✗ feed.xml is not well-formed XML: ${wellFormed.err.msg} (line ${wellFormed.err.line})`);
  process.exit(1);
}
console.log('✓ well-formed XML');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  isArray: (name) => ['item', 'itunes:category'].includes(name),
});
const rss = parser.parse(xml).rss;
const channel = rss?.channel;
if (rss?.['@version'] !== '2.0' || !channel) {
  console.error('✗ root must be <rss version="2.0"> with a <channel>');
  process.exit(1);
}

const text = (node: unknown): string => (typeof node === 'object' && node ? String((node as any)['#text'] ?? '') : String(node ?? '')).trim();
const requireText = (node: any, name: string, where: string) => {
  if (!text(node?.[name])) fail(`${where}: missing <${name}>`);
};
const site = new URL(text(channel.link));

// ADR 0003: subscriptions are tied to the exact feed URL, so pin it to the address chosen in
// #46. Changing `site` in astro.config.ts must fail here rather than quietly move the feed.
// Every link, image, enclosure and transcript must then be on that same origin.
const feedOrigin = new URL(FEED_URL).origin;
if (site.origin !== feedOrigin) fail(`channel: <link> ${site.href} is not on ${feedOrigin}`);
const selfLink = [channel['atom:link']].flat().find((link: any) => link?.['@rel'] === 'self')?.['@href'];
if (selfLink !== FEED_URL) fail(`channel: <atom:link rel="self"> is ${selfLink}, must be ${FEED_URL}`);
const requireOnSite = (url: string | undefined, where: string) => {
  if (url && !url.startsWith(`${site.origin}/`)) fail(`${where}: ${url} is not on ${site.origin}`);
};

// Channel: RSS 2.0 requires title, link, description; Apple requires title, description,
// itunes:image, language, itunes:category and itunes:explicit.
for (const name of ['title', 'link', 'description', 'language', 'copyright', 'itunes:author']) requireText(channel, name, 'channel');
if (!channel['itunes:image']?.['@href']) fail('channel: missing <itunes:image href>');
requireOnSite(channel['itunes:image']?.['@href'], 'channel <itunes:image>');
const category = channel['itunes:category']?.[0];
if (category?.['@text'] !== 'Education' || category?.['itunes:category']?.[0]?.['@text'] !== 'Language Learning') {
  fail('channel: category must be Education → Language Learning');
}
if (text(channel['itunes:explicit']) !== 'false') fail('channel: <itunes:explicit> must be false');
if (text(channel.language) !== 'en') fail('channel: <language> must be en');
if (text(channel['itunes:type']) !== 'serial') fail('channel: <itunes:type> must be serial (ADR 0003)');
if (!/unofficial/i.test(text(channel.description))) fail('channel: description must say the archive is unofficial');

// Items: RSS 2.0 requires a title or description; Apple requires title, enclosure and guid.
const items: any[] = channel.item ?? [];
if (items.length !== EPISODES) fail(`expected ${EPISODES} items, found ${items.length}`);
const guids = new Set<string>();
let transcriptCues = 0;
let transcripts = 0;
const withoutTranscript: string[] = [];
items.forEach((item, index) => {
  const where = `item ${index + 1} (${text(item.title) || 'untitled'})`;
  for (const name of ['title', 'link', 'guid', 'pubDate', 'description', 'itunes:duration']) requireText(item, name, where);
  if ('itunes:season' in item) fail(`${where}: has <itunes:season> (ADR 0003: no seasons)`);
  if (Number(text(item['itunes:episode'])) !== index + 1) fail(`${where}: <itunes:episode> must be ${index + 1}, in order`);
  if (!/^(Pronunciation|Grammar|Supplementary) \d+ · /.test(text(item.title))) fail(`${where}: title must name the series`);
  if (Number.isNaN(Date.parse(text(item.pubDate)))) fail(`${where}: <pubDate> is not a date`);
  if (!/^\d+$/.test(text(item['itunes:duration']))) fail(`${where}: <itunes:duration> must be whole seconds`);
  if (!item['itunes:image']?.['@href']) fail(`${where}: missing <itunes:image href>`);
  requireOnSite(text(item.link), `${where} <link>`);
  requireOnSite(item['itunes:image']?.['@href'], `${where} <itunes:image>`);

  const description = text(item.description);
  if (!description.includes('CC BY 3.0')) fail(`${where}: description lacks the CC BY 3.0 credit`);
  if (!description.includes(`href="${text(item.link)}"`)) fail(`${where}: description lacks a link to the lesson page`);
  const lessonId = text(item.guid).replace(/^tafalado-/, '');
  if (!notesById.has(lessonId)) fail(`${where}: no notes in src/content/notes/${lessonId}.md`);
  // Its dialog iff its notes have one, every turn in every language; none otherwise.
  const notesCheck = checkDescription(description, dialogs.get(lessonId));
  for (const error of notesCheck.errors) fail(`${where}: description ${error}`);
  for (const warning of notesCheck.warnings) warnings.push(`${where}: description ${warning}`);

  checkTranscriptTag(item['podcast:transcript'], lessonId, where);

  const guid = text(item.guid);
  if (guids.has(guid)) fail(`${where}: duplicate guid ${guid}`);
  guids.add(guid);
  if (guid.includes(site.host)) fail(`${where}: guid must not depend on the domain`);

  const enclosure = item.enclosure;
  if (!enclosure?.['@url'] || !enclosure['@length'] || enclosure['@type'] !== 'audio/mpeg') {
    fail(`${where}: <enclosure> needs url, length and type="audio/mpeg"`);
    return;
  }
  const audio = new URL(enclosure['@url']);
  if (audio.origin !== site.origin) {
    fail(`${where} <enclosure>: ${audio.href} is not on ${site.origin}`);
    return;
  }
  const size = statSync(new URL(`.${decodeURIComponent(audio.pathname)}`, DIST), { throwIfNoEntry: false })?.size;
  if (size === undefined) fail(`${where}: enclosure ${audio.pathname} is not in dist/`);
  else if (size !== Number(enclosure['@length'])) fail(`${where}: enclosure length ${enclosure['@length']} ≠ ${size} bytes on disk`);
});
if (!/^Pronunciation 1 · /.test(text(items[0]?.title))) fail('the first item must be Pronunciation 1 (Lesson 1)');

// Every episode links its transcript (docs/transcripts.md) once: type text/vtt, on the site, at
// the lesson's own path, served from a file in dist/ that passes the format checks.
function checkTranscriptTag(tag: any, lessonId: string, where: string) {
  const tags = [tag].flat().filter(Boolean);
  if (tags.length === 0) {
    withoutTranscript.push(lessonId);
    return;
  }
  if (tags.length > 1) {
    fail(`${where}: ${tags.length} <podcast:transcript> tags, at most one`);
    return;
  }
  transcripts++;
  const url = tags[0]['@url'];
  if (tags[0]['@type'] !== TRANSCRIPT_TYPE) fail(`${where} <podcast:transcript>: type must be ${TRANSCRIPT_TYPE}`);
  if (!url) {
    fail(`${where} <podcast:transcript>: missing url`);
    return;
  }
  const transcript = new URL(url);
  if (transcript.origin !== site.origin) {
    fail(`${where} <podcast:transcript>: ${url} is not on ${site.origin}`);
    return;
  }
  if (transcript.pathname !== transcriptPath(lessonId)) fail(`${where} <podcast:transcript>: ${url} is not ${transcriptPath(lessonId)}`);
  let vtt: string;
  try {
    vtt = readFileSync(new URL(`.${decodeURIComponent(transcript.pathname)}`, DIST), 'utf8');
  } catch {
    fail(`${where}: transcript ${transcript.pathname} is not in dist/`);
    return;
  }
  const check = checkTranscript(vtt);
  for (const error of check.errors.slice(0, 5)) fail(`${where}: transcript ${error}`);
  if (check.errors.length > 5) fail(`${where}: transcript has ${check.errors.length - 5} more problem(s)`);
  transcriptCues += check.cues;
}

const withDialog = items.filter((item) => dialogs.get(text(item.guid).replace(/^tafalado-/, ''))).length;
const withNotes = [...dialogs.values()].filter(Boolean).length;
if (withDialog !== withNotes) fail(`${withNotes} lessons have a dialog in their notes, but ${withDialog} feed items match them`);

if (withoutTranscript.length) fail(`${withoutTranscript.length} episodes have no <podcast:transcript>: ${withoutTranscript.join(', ')}`);
for (const warning of warnings) console.warn(`⚠ ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`);
  console.error(`\n${errors.length} problem(s) in dist/feed.xml`);
  process.exit(1);
}
console.log('✓ RSS 2.0 required elements (channel title, link, description; item title, guid)');
console.log('✓ Apple required tags (itunes:image, itunes:category, itunes:explicit, language, enclosure)');
console.log(`✓ atom:link self is ${FEED_URL}; links, images and enclosures on ${site.origin}`);
console.log('✓ ADR 0003: itunes:type serial, itunes:episode 1–46 in order, no itunes:season, series in titles');
console.log(`✓ ${items.length} enclosures, every length matches the file size in dist/`);
console.log(`✓ ${withDialog} descriptions hold their lesson's dialog in pt-BR, es and en; no <mark>`);
console.log(`✓ ${transcripts} transcripts (text/vtt, on the site, in dist/): ${transcriptCues} cues, each with a speaker, ≤ 2 lines of ≤ 65 characters`);
console.log(`✓ first episode: ${text(items[0].title)}`);
