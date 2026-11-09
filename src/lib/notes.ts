import { getCollection, type CollectionEntry } from 'astro:content';
import { getLessons, type Lesson } from './lessons';
import { checkNotes, checkNotesCoverage, resolveDialog } from './notes-check';
import type { Clip, Turn } from './notes-schema';

/** A lesson's notes, ready for its page: the entry (for `render`), and its dialog with any shared one resolved. */
export type LessonNotes = { entry: CollectionEntry<'notes'>; dialog?: Turn[]; clips?: Clip[] };

let cache: Promise<Map<string, LessonNotes>> | undefined;

/**
 * Every lesson's notes, keyed by lesson id (`pronunciation-01`). Fails the build, naming the file,
 * on bad markup, an empty body, notes with no lesson, a lesson with no notes (#89)
 * and a shared dialog that can't be resolved.
 */
export function getAllNotes(): Promise<Map<string, LessonNotes>> {
  cache ??= Promise.all([getCollection('notes'), getLessons()]).then(([entries, lessons]) => {
    checkNotesCoverage(
      lessons.map((l) => l.id),
      entries.map((e) => e.id),
    );
    const byId = new Map(entries.map((e) => [e.id, e]));
    return new Map(
      entries.map((entry) => {
        if (!entry.body?.trim()) throw new Error(`Notes "${entry.id}" have no body (Cultural notes, Pronunciation or Grammar notes).`);
        checkNotes(entry);
        return [entry.id, { entry, dialog: resolveDialog(entry, byId), clips: entry.data.clips }];
      }),
    );
  });
  return cache;
}

export async function getNotes(lesson: Lesson): Promise<LessonNotes | undefined> {
  return (await getAllNotes()).get(lesson.id);
}
