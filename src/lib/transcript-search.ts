// Searching every episode's transcript from the sidebar's lesson filter (#7, #106). One prebuilt file
// of every cue's plain text (src/pages/data/transcript-cues.json.ts) is searched with the same uFuzzy
// setup as the lesson filter (src/lib/fuzzy.ts). Pure, so unit tests reach it without the DOM;
// src/lib/sidebar-ui.ts puts it on the page. The research is docs/research/transcript-search.md.
import { fuzzySearch, latinize } from './fuzzy';
import type { Cue } from './transcript';
import { visibleText } from './transcript-check';
import { escape } from './transcript-view';

/** Where the sidebar fetches every cue, the first time transcripts are searched. */
export const TRANSCRIPT_CUES_PATH = '/data/transcript-cues.json';

/** What /data/transcript-cues.json holds: each lesson's cues, in episode order. */
export type TranscriptCues = {
  /** The lesson's path, which is also its track id (`/pronunciation/13`). */
  lesson: string;
  /** Each cue's start, in seconds. */
  starts: number[];
  /** Each cue's text: its HTML with the tags removed and the entities unescaped. */
  texts: string[];
}[];

/** The cue file's content, from each lesson's path and parsed cues (at build time). */
export const toTranscriptCues = (lessons: [lesson: string, cues: Cue[]][]): TranscriptCues =>
  lessons.map(([lesson, cues]) => ({
    lesson,
    starts: cues.map((cue) => cue.start),
    texts: cues.map((cue) => visibleText(cue.html)),
  }));

/** One transcript line the query matches. */
export interface TranscriptHit {
  lesson: string;
  start: number;
  text: string;
  /** Where the query matched in `text`: [start0, end0, start1, end1, …]. */
  ranges: number[];
}

/** Transcripts are searched only from this many characters: one letter matches nearly every line. */
export const MIN_TRANSCRIPT_QUERY = 2;

/**
 * Takes every lesson's cues, returns a function from a query to the matching lines, in episode
 * order and then time order. A query shorter than MIN_TRANSCRIPT_QUERY matches nothing.
 */
export function createTranscriptSearch(data: TranscriptCues): (query: string) => TranscriptHit[] {
  const cues = data.flatMap(({ lesson, starts, texts }) => texts.map((text, i) => ({ lesson, start: starts[i]!, text })));
  const haystack = latinize(cues.map((cue) => cue.text));
  return (query) => {
    if (query.trim().length < MIN_TRANSCRIPT_QUERY) return [];
    const matches = fuzzySearch(haystack, query) ?? [];
    return matches.sort((a, b) => a.index - b.index).map(({ index, ranges }) => ({ ...cues[index]!, ranges }));
  };
}

/** A line's text as HTML: escaped, with each range marked. */
export function markedHtml(text: string, ranges: number[]): string {
  let html = '';
  let at = 0;
  for (let i = 0; i < ranges.length; i += 2) {
    html += `${escape(text.slice(at, ranges[i]))}<mark>${escape(text.slice(ranges[i], ranges[i + 1]))}</mark>`;
    at = ranges[i + 1]!;
  }
  return html + escape(text.slice(at));
}
