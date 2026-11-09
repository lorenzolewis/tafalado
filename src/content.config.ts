import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { SERIES, SERIES_SIZE } from './lib/series';

// See docs/lesson-schema.md. Uniqueness across entries (episode, series + number)
// can't be checked per entry, so src/lib/lessons.ts checks it when the collection loads.

/** Opaque: a root-relative path (`/mp3/…`) or an absolute http(s) URL. Never parsed further. */
const mediaUrl = z
  .string()
  .refine((url) => url.startsWith('/') || /^https?:\/\//.test(url), {
    message: 'Must be a root-relative path like "/mp3/tafalado_01.mp3" or an absolute http(s) URL',
  });

const lessons = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/lessons' }),
  schema: z
    .object({
      series: z.enum(SERIES),
      number: z.number().int().min(1),
      episode: z.number().int().min(1).max(46),
      title: z.string().min(1),
      topic: z.string().min(1).optional(),
      date: z.coerce.date(),
      audio: z.object({
        url: mediaUrl,
        durationSeconds: z.number().int().positive(),
        bytes: z.number().int().positive(),
      }),
      pdf: z.object({
        url: mediaUrl,
        bytes: z.number().int().positive(),
      }),
      photo: z
        .object({
          url: mediaUrl,
          alt: z.string().trim().min(1, 'A photo needs alt text'),
        })
        .optional(),
    })
    .strict()
    .refine((lesson) => lesson.number <= SERIES_SIZE[lesson.series], {
      path: ['number'],
      message: 'Number is past the end of its series (pronunciation 24, grammar 20, supplementary 2)',
    }),
});

/** Who speaks in the dialogs and clips. Add a name here when the notes need one. */
export const SPEAKERS = ['Valdo', 'Michelle', 'Vivian', 'Orlando', 'José Luis'] as const;
const speaker = z.enum(SPEAKERS);
const line = z.string().trim().min(1, 'Must not be empty');

const turn = z.object({ speaker, pt: line, es: line, en: line }).strict();

// A lesson's study notes (#88): its dialog (or Pronunciation 24's clips) and the Markdown body. The
// file is named after its lesson. src/lib/notes.ts checks the markup, the lesson pairing and shared
// dialogs when the collection loads.
const notes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/notes' }),
  schema: z
    .object({
      /** The episode's lesson page on COERLL (SOURCES.md), not its PDF. */
      source: z
        .string()
        .regex(
          /^https:\/\/www\.coerll\.utexas\.edu\/brazilpod\/tafalado\/lesson-(\d{2}|gra\d{2}|suppl\d{2})\.html$/,
          'Must be the lesson page on COERLL, like "https://www.coerll.utexas.edu/brazilpod/tafalado/lesson-01.html"',
        ),
      dialog: z
        .union([
          z.array(turn).min(1),
          // A dialog stored once in another lesson's notes (the alternate takes, 10/11, 12/13, 14/15),
          // optionally recast with one speaker per turn.
          z.object({ from: z.string().min(1), speakers: z.array(speaker).min(1).optional() }).strict(),
        ])
        .optional(),
      clips: z
        .array(
          z
            .object({
              heading: line,
              speakers: z.array(speaker).min(1),
              lines: z.array(line).min(1),
              translation: z.object({ es: line, en: line }).strict().optional(),
              observations: line,
            })
            .strict(),
        )
        .min(1)
        .optional(),
    })
    .strict()
    // Not both. Neither is only for supplementary lessons, which have no dialog (src/lib/notes-check.ts).
    .refine((n) => n.dialog === undefined || n.clips === undefined, {
      message: 'Give a dialog or clips, not both',
    }),
});

export const collections = { lessons, notes };
