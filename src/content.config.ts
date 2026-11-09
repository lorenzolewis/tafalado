import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { notesSchema } from './lib/notes-schema';
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

// A lesson's study notes (#88), one file per lesson named after it. Their frontmatter's shape is
// src/lib/notes-schema.ts, shared with the checks and the feed validator.
const notes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/notes' }),
  schema: notesSchema,
});

export const collections = { lessons, notes };
