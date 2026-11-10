// PROTOTYPE (#99, #94): throwaway. Parses an episode's WebVTT transcript (docs/transcripts.md) and
// finds each dialog turn's readings in it by text. Runs at build time only; the browser gets JSON
// from src/pages/transcripts/[id].json.ts.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Turn } from './notes-schema';

/** Lessons the prototype covers. */
export const PROTO_LESSONS = ['grammar-03'];

export interface Cue {
  start: number;
  end: number;
  speaker: string;
  /** The text as HTML, `<lang x>` turned into `<i lang="x">`. */
  html: string;
}

/** One reading of a dialog turn: the run of cues that says the turn's text. */
export interface Reading {
  start: number;
  end: number;
  firstCue: number;
  lastCue: number;
}

export interface TranscriptData {
  cues: Cue[];
  /** For each dialog turn, in order, every reading found (empty when none matched). */
  turns: Reading[][];
}

const seconds = (stamp: string) => {
  const [h, m, s] = stamp.split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
};

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function parseVtt(vtt: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of vtt.replaceAll('\r', '').split(/\n{2,}/)) {
    const lines = block.split('\n');
    const timing = lines.findIndex((line) => line.includes('-->'));
    if (timing === -1) continue;
    const [from, to] = lines[timing].split('-->').map((part) => part.trim().split(/\s+/)[0]);
    let body = lines.slice(timing + 1).join(' ');
    const voice = /^<v\s+([^>]+)>/.exec(body);
    const speaker = voice?.[1].trim() ?? '';
    if (voice) body = body.slice(voice[0].length);
    // Escape everything, then bring back the <lang> spans as <i lang>.
    const html = escape(body)
      .replace(/&lt;lang ([\w-]+)&gt;/g, '<i lang="$1">')
      .replaceAll('&lt;/lang&gt;', '</i>')
      .trim();
    cues.push({ start: seconds(from), end: seconds(to), speaker, html });
  }
  return cues;
}

/** Letters and digits only, lowercased, one space between words: what matching compares. */
const normalize = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Every place each turn's Portuguese is said in full, across however many cues it was split into. */
export function matchTurns(cues: Cue[], turns: Turn[]): Reading[][] {
  // One long string of every cue's words, remembering where each cue starts in it.
  let haystack = '';
  const starts: number[] = [];
  for (const cue of cues) {
    starts.push(haystack.length);
    haystack += normalize(cue.html) + ' ';
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
  return turns.map((turn) => {
    const needle = normalize(turn.pt);
    const readings: Reading[] = [];
    if (!needle) return readings;
    for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length)) {
      const firstCue = cueAt(at);
      const lastCue = cueAt(at + needle.length - 1);
      readings.push({ start: cues[firstCue].start, end: cues[lastCue].end, firstCue, lastCue });
    }
    return readings;
  });
}

export async function loadTranscript(id: string, turns: Turn[] = []): Promise<TranscriptData> {
  const vtt = await readFile(join(process.cwd(), 'public', 'transcripts', `${id}.vtt`), 'utf8');
  const cues = parseVtt(vtt);
  const matched = matchTurns(cues, turns);
  matched.forEach((readings, i) => {
    if (!readings.length) console.warn(`[transcript-proto] ${id}: dialog turn ${i + 1} not found in the transcript`);
  });
  return { cues, turns: matched };
}

/** `0:13`, `12:04`. */
export const stamp = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
