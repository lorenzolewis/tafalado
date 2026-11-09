import { getCollection, type CollectionEntry } from 'astro:content';
import { getLessons, type Lesson } from './lessons';
import { highlightLegend, type LegendEntry } from './highlights';
import { checkNotes, checkNotesCoverage, resolveDialog } from './notes-check';
import type { Clip, Turn } from './notes-schema';

/**
 * A lesson's notes, ready for its page: the entry (for `render`), its dialog with any shared one
 * resolved, and what each highlight colour in the dialog or clips means (#93).
 */
export type LessonNotes = { entry: CollectionEntry<'notes'>; dialog?: Turn[]; clips?: Clip[]; legend: LegendEntry[] };

/** The strings of a dialog's turns or clips that the "Show" controls act on. */
function dialogLines({ dialog, clips }: Pick<LessonNotes, 'dialog' | 'clips'>): string[] {
  return [
    ...(dialog ?? []).flatMap((turn) => [turn.pt, turn.es, turn.en]),
    ...(clips ?? []).flatMap((clip) => [...clip.lines, clip.translation?.es ?? '', clip.translation?.en ?? '']),
  ];
}

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
    const seriesOf = new Map(lessons.map((l) => [l.id, l.data.series]));
    return new Map(
      entries.map((entry) => {
        if (!entry.body?.trim()) throw new Error(`Notes "${entry.id}" have no body (Cultural notes, Pronunciation or Grammar notes).`);
        checkNotes(entry);
        const dialog = resolveDialog(entry, byId);
        const { clips } = entry.data;
        // A shared dialog brings its labels unless the lesson gives its own.
        const shared = Array.isArray(entry.data.dialog) ? undefined : entry.data.dialog?.from;
        const labels = entry.data.highlights ?? (shared ? byId.get(shared)?.data.highlights : undefined);
        const legend = highlightLegend(entry.id, seriesOf.get(entry.id)!, dialogLines({ dialog, clips }), labels);
        return [entry.id, { entry, dialog, clips, legend }];
      }),
    );
  });
  return cache;
}

export async function getNotes(lesson: Lesson): Promise<LessonNotes | undefined> {
  return (await getAllNotes()).get(lesson.id);
}
