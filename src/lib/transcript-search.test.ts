import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { latinize } from './fuzzy';
import { parseVtt, type Cue } from './transcript';
import { createTranscriptSearch, markedHtml, toTranscriptCues, type TranscriptCues } from './transcript-search';

// Two lessons' cues, as /data/transcript-cues.json holds them.
const data: TranscriptCues = [
  { lesson: '/pronunciation/02', starts: [1, 5.5, 9], texts: ['Words like ação and coração.', 'Você sabe?', 'Meu coração bate.'] },
  { lesson: '/pronunciation/13', starts: [3, 70], texts: ['Comprei um ingresso.', 'O ingresso do cinema, a ticket.'] },
];
const hits = (query: string) => createTranscriptSearch(data)(query).map((h) => `${h.lesson}@${h.start}`);

describe('transcript search', () => {
  it('ignores accents and case', () => {
    expect(hits('coracao')).toEqual(['/pronunciation/02@1', '/pronunciation/02@9']);
    expect(hits('VOCÊ')).toEqual(['/pronunciation/02@5.5']);
  });

  it('tolerates one typo per word', () => {
    expect(hits('corazao')).toEqual(['/pronunciation/02@1', '/pronunciation/02@9']);
    expect(hits('ingreso')).toEqual(['/pronunciation/13@3', '/pronunciation/13@70']);
  });

  it('matches words in any order, all of them on the line', () => {
    expect(hits('cinema ingresso')).toEqual(['/pronunciation/13@70']);
    expect(hits('ticket coração')).toEqual([]);
  });

  it('gives where the query matched on each line', () => {
    const [hit] = createTranscriptSearch(data)('ingresso cinema').filter((h) => h.start === 70);
    const marked = [];
    for (let i = 0; i < hit!.ranges.length; i += 2) marked.push(hit!.text.slice(hit!.ranges[i], hit!.ranges[i + 1]));
    expect(marked).toEqual(['ingresso', 'cinema']);
  });

  it('searches nothing below two characters', () => {
    expect(hits('a')).toEqual([]);
    expect(hits('  ')).toEqual([]);
  });

  it('marks the matches in a line, escaped', () => {
    expect(markedHtml('<b> & ação', [6, 10])).toBe('&lt;b&gt; &amp; <mark>ação</mark>');
    expect(markedHtml('o ingresso do cinema', [2, 10, 14, 20])).toBe('o <mark>ingresso</mark> do <mark>cinema</mark>');
  });
});

describe('the cue file', () => {
  const dir = new URL('../../public/transcripts/', import.meta.url);
  const lessons = readdirSync(dir)
    .filter((file) => file.endsWith('.vtt'))
    .map((file): [string, Cue[]] => [file, parseVtt(readFileSync(new URL(file, dir), 'utf8'))]);
  const cues = toTranscriptCues(lessons);

  it('holds every cue as plain text', () => {
    const texts = cues.flatMap((l) => l.texts);
    expect(texts.length).toBe(lessons.reduce((n, [, c]) => n + c.length, 0));
    expect(texts.filter((t) => /<\/?i|&(amp|lt|gt);/.test(t))).toEqual([]);
  });

  // The highlight ranges are found in the accent-folded text and drawn on the original.
  it('keeps every line the same length when accents are folded', () => {
    const changed = cues.flatMap((l) => l.texts).filter((t) => latinize(t).length !== t.length);
    expect(changed).toEqual([]);
  });
});
