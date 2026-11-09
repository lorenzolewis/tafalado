// Checks on the notes collection (#88, docs/lesson-schema.md) that Zod can't make per field: the
// markup inside strings and bodies, lessons without notes, and shared dialogs. Pure, so unit tests
// reach it without astro:content; src/lib/notes.ts runs it when the collection loads.

export type Turn = { speaker: string; pt: string; es: string; en: string };
export type SharedDialog = { from: string; speakers?: string[] };
export type Clip = {
  heading: string;
  speakers: string[];
  lines: string[];
  translation?: { es: string; en: string };
  observations: string;
};
export type NotesData = { source: string; dialog?: Turn[] | SharedDialog; clips?: Clip[] };
export type NotesEntry = { id: string; body?: string; data: NotesData };

/** The `lang` values notes may mark inline: words (`<i lang>`) and IPA (`<span lang>`). */
export const NOTES_LANGS = new Set(['pt-BR', 'es', 'pt-BR-fonipa', 'es-fonipa', 'en-fonipa']);

/** The only tags allowed inside dialog and clip strings (rendered as HTML). */
const STRING_TAGS = new Set(['mark', 'i', 'em', 'span']);

/** Fails the build with the file and place of the first markup problem in a notes entry. */
export function checkNotes({ id, body = '', data }: NotesEntry): void {
  const fail = (where: string, problem: string) => {
    throw new Error(`Notes "${id}"${where ? ` (${where})` : ''}: ${problem}`);
  };
  const check = (text: string, where: string, isString: boolean) => {
    const problem = markProblem(text) ?? langProblem(text) ?? (isString ? tagProblem(text) : undefined);
    if (problem) fail(where, problem);
  };

  check(body, '', false);
  if (Array.isArray(data.dialog))
    data.dialog.forEach((turn, i) => {
      for (const lang of ['pt', 'es', 'en'] as const) check(turn[lang], `dialog turn ${i + 1}, ${lang}`, true);
    });
  data.clips?.forEach((clip, i) => {
    const strings = [clip.heading, ...clip.lines, clip.translation?.es, clip.translation?.en, clip.observations];
    for (const s of strings) if (s !== undefined) check(s, `clip ${i + 1}`, true);
  });
}

function markProblem(text: string): string | undefined {
  let open = false;
  for (const [, close] of text.matchAll(/<(\/?)mark\s*>/g)) {
    if (open === !close) return close ? 'a </mark> closes no open <mark>' : 'a <mark> opens inside another <mark>';
    open = !close;
  }
  return open ? 'a <mark> is never closed with </mark>' : undefined;
}

function langProblem(text: string): string | undefined {
  for (const [, lang] of text.matchAll(/\blang=["']?([^"'\s>]*)/g))
    if (!NOTES_LANGS.has(lang))
      return `lang="${lang}" isn't allowed. Use pt-BR or es on words, pt-BR-fonipa, es-fonipa or en-fonipa on IPA.`;
}

function tagProblem(text: string): string | undefined {
  for (const [, tag] of text.matchAll(/<\/?([a-zA-Z][\w-]*)/g))
    if (!STRING_TAGS.has(tag.toLowerCase())) return `<${tag}> isn't allowed. Use only <mark>, <i>, <em> and <span>.`;
}

/**
 * Every notes file must belong to a lesson. Every lesson must have notes once `requireAll` is on
 * (src/lib/notes.ts: it's off until the notes for all 46 lessons are written, #89).
 */
export function checkNotesCoverage(lessonIds: string[], notesIds: string[], requireAll: boolean): void {
  const lessons = new Set(lessonIds);
  const orphans = notesIds.filter((id) => !lessons.has(id));
  if (orphans.length)
    throw new Error(`Notes with no lesson: ${orphans.join(', ')}. Name each file after its lesson (src/content/lessons/).`);
  if (!requireAll) return;
  const notes = new Set(notesIds);
  const missing = lessonIds.filter((id) => !notes.has(id));
  if (missing.length) throw new Error(`Lessons with no notes: ${missing.join(', ')}. Add src/content/notes/<lesson>.md.`);
}

/**
 * A lesson's dialog: its own, or the one it shares (`dialog: { from }`), with the speakers recast
 * turn by turn when it gives `speakers`. Undefined for clips.
 */
export function resolveDialog(entry: NotesEntry, byId: ReadonlyMap<string, NotesEntry>): Turn[] | undefined {
  const { dialog } = entry.data;
  if (!dialog || Array.isArray(dialog)) return dialog;
  const shared = byId.get(dialog.from)?.data.dialog;
  if (!Array.isArray(shared))
    throw new Error(`Notes "${entry.id}" shares the dialog of "${dialog.from}", which has no dialog of its own.`);
  const { speakers } = dialog;
  if (!speakers) return shared;
  if (speakers.length !== shared.length)
    throw new Error(
      `Notes "${entry.id}" recasts a dialog of ${shared.length} turns with ${speakers.length} speaker(s). Give one per turn.`,
    );
  return shared.map((turn, i) => ({ ...turn, speaker: speakers[i] }));
}
