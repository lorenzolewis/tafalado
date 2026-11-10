// An episode's WebVTT transcript (docs/transcripts.md) as the site shows it: parsed into cues for the
// player's transcript (#99), and each dialog turn's readings found in it by text, for tap-to-seek and
// read-along (#94). Pure and build-time only, so unit tests reach it without astro:content; the
// browser gets the result as JSON (src/pages/data/transcripts/[id].json.ts) and never parses VTT.
// src/lib/transcripts.ts reads the files and runs the checks below when the site builds.

import type { Turn } from './notes-schema.ts';
import { checkTranscript, visibleText } from './transcript-check.ts';

/** One cue, kept as split in the VTT. */
export interface Cue {
  /** Seconds into the episode. */
  start: number;
  end: number;
  /** From `<v Name>`; empty only in a file the build check rejects. */
  speaker: string;
  /** The text as HTML: escaped, with each `<lang x>` span as `<i lang="x">`. */
  html: string;
  /** Set when every word of the cue is inside one language's spans (`pt-BR`, `es`): a dialog line. */
  lang?: string;
}

/** One reading of a dialog turn: the run of cues that says the turn's Portuguese. */
export interface Reading {
  start: number;
  end: number;
  firstCue: number;
  lastCue: number;
}

/** What `/data/transcripts/<id>.json` holds. */
export interface TranscriptData {
  cues: Cue[];
}

const TIMING = /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)\s+-->\s+(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/;
const seconds = (h: string, m: string, s: string) => Math.round((+h * 3600 + +m * 60 + +s) * 1000) / 1000;
const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** The cue's text as HTML: everything escaped, then the language spans brought back as `<i lang>`. */
function toHtml(text: string): string {
  let html = '';
  let last: string | undefined; // the language of the span just closed, while only spaces follow it
  for (const part of text.split(/(<\/?lang[^>]*>)/)) {
    const open = part.match(/^<lang ([\w-]+)>$/);
    if (open) {
      // A span the VTT closes at a line break and reopens on the next line is one span here.
      if (last === open[1]) html = html.replace(/<\/i>(\s*)$/, '$1');
      else html += `<i lang="${open[1]}">`;
      last = undefined;
    } else if (part === '</lang>') {
      html += '</i>';
      last = [...html.matchAll(/<i lang="([\w-]+)">/g)].at(-1)?.[1];
    } else {
      html += escape(visibleText(part));
      if (part.trim()) last = undefined;
    }
  }
  return html;
}

/** The one language a cue is entirely in, if any: one language's spans and nothing else but punctuation. */
function wholeLang(html: string): string | undefined {
  const langs = new Set([...html.matchAll(/<i lang="([\w-]+)">/g)].map((m) => m[1]));
  if (langs.size !== 1) return undefined;
  const outside = html.replace(/<i lang="[\w-]+">[^<]*<\/i>/g, '');
  return /[\p{L}\p{N}]/u.test(outside) ? undefined : [...langs][0];
}

/** The cues of a WebVTT file, in order. `NOTE` blocks and the header are skipped. */
export function parseVtt(vtt: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of vtt.replace(/\r\n?/g, '\n').split(/\n{2,}/)) {
    const lines = block.split('\n').filter((line) => line !== '');
    const at = lines.findIndex((line) => TIMING.test(line));
    if (at === -1 || lines[0].startsWith('NOTE')) continue;
    const t = lines[at].match(TIMING)!;
    let text = lines.slice(at + 1).join(' ');
    const voice = text.match(/^<v\s+([^>]+)>/);
    if (voice) text = text.slice(voice[0].length);
    const html = toHtml(text.replace(/<\/v>/g, '')).trim();
    const cue: Cue = { start: seconds(t[1], t[2], t[3]), end: seconds(t[4], t[5], t[6]), speaker: voice?.[1].trim() ?? '', html };
    const lang = wholeLang(html);
    if (lang) cue.lang = lang;
    cues.push(cue);
  }
  return cues;
}

/** What matching compares: letters and digits only, lowercased, tags dropped, one space between words. */
const words = (html: string) =>
  visibleText(html)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/**
 * Every place each turn's Portuguese is said in full, in order, across however many cues it was
 * split into. Marks, case and punctuation don't count; a turn only matches whole words. A turn that
 * isn't there gets no readings.
 */
export function matchTurns(cues: Cue[], turns: Pick<Turn, 'pt'>[]): Reading[][] {
  // Every cue's words in one string, spaced at both ends, remembering where each cue starts.
  let haystack = ' ';
  const starts: number[] = [];
  for (const cue of cues) {
    starts.push(haystack.length);
    const w = words(cue.html);
    if (w) haystack += `${w} `;
  }
  const cueAt = (offset: number) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  return turns.map(({ pt }) => {
    const readings: Reading[] = [];
    const said = words(pt);
    if (!said) return readings;
    const needle = ` ${said} `;
    for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length - 1)) {
      const firstCue = cueAt(at + 1);
      const lastCue = cueAt(at + needle.length - 2);
      readings.push({ start: cues[firstCue].start, end: cues[lastCue].end, firstCue, lastCue });
    }
    return readings;
  });
}

/**
 * Fails the build when a transcript names no lesson, or doesn't follow docs/transcripts.md (a cue
 * with no speaker among it), so every lesson with a file gets its JSON and every line its speaker.
 * `files` maps each file's lesson id (its name without `.vtt`) to its text.
 */
export function checkTranscriptFiles(lessonIds: Iterable<string>, files: Record<string, string>): void {
  const lessons = new Set(lessonIds);
  for (const [id, vtt] of Object.entries(files)) {
    const where = `public/transcripts/${id}.vtt`;
    if (!lessons.has(id)) throw new Error(`Transcript ${where}: no lesson "${id}"; name it after its lesson id.`);
    const { errors } = checkTranscript(vtt);
    if (errors.length) throw new Error(`Transcript ${where}: ${errors.join('; ')}`);
    if (parseVtt(vtt).some((cue) => !cue.speaker)) throw new Error(`Transcript ${where}: a cue has no <v Name> speaker`);
  }
}

/**
 * Fails the build when a dialog turn of a lesson with a transcript is never read in it: the notes and
 * the VTT have drifted (pass 3 in docs/transcripts.md keeps them in step).
 */
export function checkReadings(id: string, turns: Pick<Turn, 'pt'>[], readings: Reading[][]): void {
  turns.forEach((turn, i) => {
    if (!readings[i]?.length)
      throw new Error(
        `Transcript "${id}": dialog turn ${i + 1} ("${visibleText(turn.pt)}") is not in public/transcripts/${id}.vtt. ` +
          'Make the transcript read the turn as the notes give it (docs/transcripts.md).',
      );
  });
}
