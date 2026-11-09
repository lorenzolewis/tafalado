import { getCollection, type CollectionEntry } from 'astro:content';
import { getLessons, type Lesson } from './lessons';
import { checkNotes, checkNotesCoverage, resolveDialog, type Turn } from './notes-check';

export type NotesEntry = CollectionEntry<'notes'>;

/** A lesson's notes, ready for its page: the entry (for `render`), and its dialog with any shared one resolved. */
export type LessonNotes = { entry: NotesEntry; dialog?: Turn[]; clips?: NotesEntry['data']['clips'] };

/**
 * TODO(#89): set to true once src/content/notes/ has a file for every lesson. While false, a lesson
 * may have no notes (its page keeps the PDF link); notes with no lesson always fail the build.
 */
const REQUIRE_NOTES_FOR_EVERY_LESSON = false;

let cache: Promise<Map<string, LessonNotes>> | undefined;

/**
 * Every lesson's notes, keyed by lesson id (`pronunciation-01`). Fails the build, naming the file,
 * on bad markup, an empty body, notes with no lesson (or, once required, a lesson with no notes)
 * and a shared dialog that can't be resolved.
 */
export function getAllNotes(): Promise<Map<string, LessonNotes>> {
  cache ??= Promise.all([getCollection('notes'), getLessons()]).then(([entries, lessons]) => {
    checkNotesCoverage(
      lessons.map((l) => l.id),
      entries.map((e) => e.id),
      REQUIRE_NOTES_FOR_EVERY_LESSON,
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
