// The shape of a lesson's study notes (#88, docs/lesson-schema.md): the frontmatter of
// src/content/notes/<lesson>.md. The one definition: src/content.config.ts gives it to the notes
// collection, src/lib/notes-check.ts takes its types, and scripts/validate-feed.ts parses with it.
// Free of astro:content, so plain Node and unit tests import it.

import { z } from 'astro/zod';

/** Who speaks in the dialogs and clips. Add a name here when the notes need one. */
export const SPEAKERS = ['Valdo', 'Michelle', 'Vivian', 'Orlando', 'José Luis'] as const;
const speaker = z.enum(SPEAKERS);
const line = z.string().trim().min(1, 'Must not be empty');

const turn = z.object({ speaker, pt: line, es: line, en: line }).strict();

// A dialog stored once in another lesson's notes (the alternate takes, 10/11, 12/13, 14/15),
// optionally recast with one speaker per turn.
const sharedDialog = z.object({ from: z.string().min(1), speakers: z.array(speaker).min(1).optional() }).strict();

const clip = z
  .object({
    heading: line,
    speakers: z.array(speaker).min(1),
    lines: z.array(line).min(1),
    translation: z.object({ es: line, en: line }).strict().optional(),
    observations: line,
  })
  .strict();

// What each highlight colour in the dialog marks, for its legend (#93, src/lib/highlights.ts). Needed
// once the dialog has blue or green; red alone defaults to what the series teaches.
const highlights = z.object({ red: line.optional(), blue: line.optional(), green: line.optional() }).strict();

// A lesson's dialog (or Pronunciation 24's clips). The file is named after its lesson, and the
// Markdown body holds the rest. src/lib/notes.ts checks the markup, the lesson pairing and shared
// dialogs when the collection loads.
export const notesSchema = z
  .object({
    /** The episode's lesson page on COERLL (SOURCES.md), not its PDF. */
    source: z
      .string()
      .regex(
        /^https:\/\/www\.coerll\.utexas\.edu\/brazilpod\/tafalado\/lesson-(\d{2}|gra\d{2}|suppl\d{2})\.html$/,
        'Must be the lesson page on COERLL, like "https://www.coerll.utexas.edu/brazilpod/tafalado/lesson-01.html"',
      ),
    dialog: z.union([z.array(turn).min(1), sharedDialog]).optional(),
    clips: z.array(clip).min(1).optional(),
    highlights: highlights.optional(),
  })
  .strict()
  // Not both. Neither is only for supplementary lessons, which have no dialog (src/lib/notes-check.ts).
  .refine((n) => n.dialog === undefined || n.clips === undefined, {
    message: 'Give a dialog or clips, not both',
  });

export type Speaker = (typeof SPEAKERS)[number];
export type Turn = z.infer<typeof turn>;
export type SharedDialog = z.infer<typeof sharedDialog>;
export type Clip = z.infer<typeof clip>;
export type Highlights = z.infer<typeof highlights>;
export type NotesData = z.infer<typeof notesSchema>;
