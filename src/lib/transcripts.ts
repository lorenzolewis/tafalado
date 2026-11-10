// Every episode transcript, read from public/transcripts/<lesson id>.vtt when the site builds (#99),
// with each dialog turn's readings (#94). Fails the build on a transcript that names no lesson or
// breaks docs/transcripts.md, and on a dialog turn the transcript never reads. The parsing and the
// checks are src/lib/transcript.ts.
//
// A shared dialog (`from:`) is matched against the lesson that reads it, its own episode, not the
// lesson it is stored in. Pronunciation 24's clips aren't matched: they're excerpts, broken up by
// discussion, so they get no tap-to-seek and no check.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getLessons, type Lesson } from './lessons';
import { getAllNotes } from './notes';
import { checkReadings, checkTranscriptFiles, matchTurns, parseVtt, type Cue, type Reading } from './transcript';

export interface LessonTranscript {
  cues: Cue[];
  /** For each turn of the lesson's dialog, in order, every reading of it; none without a dialog. */
  readings: Reading[][];
}

const DIR = join(process.cwd(), 'public', 'transcripts');

let cache: Promise<Map<string, LessonTranscript>> | undefined;

/** Every lesson's transcript, keyed by lesson id (`grammar-03`). Lessons without a file are absent. */
export function getAllTranscripts(): Promise<Map<string, LessonTranscript>> {
  cache ??= (async () => {
    const names = (await readdir(DIR)).filter((name) => name.endsWith('.vtt'));
    const files = Object.fromEntries(
      await Promise.all(names.map(async (name) => [name.slice(0, -'.vtt'.length), await readFile(join(DIR, name), 'utf8')] as const)),
    );
    const [lessons, notes] = await Promise.all([getLessons(), getAllNotes()]);
    checkTranscriptFiles(
      lessons.map((l) => l.id),
      files,
    );
    return new Map(
      Object.entries(files).map(([id, vtt]) => {
        const cues = parseVtt(vtt);
        const dialog = notes.get(id)?.dialog ?? [];
        const readings = matchTurns(cues, dialog);
        checkReadings(id, dialog, readings);
        return [id, { cues, readings }];
      }),
    );
  })();
  return cache;
}

export async function getTranscript(lesson: Lesson): Promise<LessonTranscript | undefined> {
  return (await getAllTranscripts()).get(lesson.id);
}

/** Where the player fetches a lesson's transcript (src/pages/data/transcripts/[id].json.ts; outside /transcripts/, which public/_headers serves as text/vtt). */
export const transcriptJsonPath = (id: string) => `/data/transcripts/${id}.json`;
