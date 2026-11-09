# Lesson schema

Each lesson is one Markdown file in `src/content/lessons/`, named `<series>-<NN>.md` (`pronunciation-01.md`, `grammar-12.md`, `supplementary-02.md`). The frontmatter is checked by the Zod schema in `src/content.config.ts`; the Markdown body is the lesson's **intro**. A file that doesn't match fails `astro check` and `astro build`.

```md
---
series: pronunciation
number: 1
episode: 1
title: Pronunciation of /i/
topic: Getting the Check at a Restaurant
date: 2006-11-09
audio:
  url: /mp3/tafalado_01.mp3
  durationSeconds: 632
  bytes: 7590390
pdf:
  url: /pdf/tafalado_01.pdf
  bytes: 154732
photo: # optional
  url: /images/lesson_pic_01.jpg
  alt: Two people at a restaurant table
---

There's only one Lesson #1. …
```

| Field | Rule |
| --- | --- |
| `series` | `pronunciation`, `grammar` or `supplementary` |
| `number` | Integer from 1 to the series size (24, 20, 2). Unique within its series. The URL is `/<series>/<NN>`. |
| `episode` | Integer 1–46, unique: the running order of the original feed (its "track number"). Supplementary 1 is episode 6, Grammar 1 is episode 27. Drives `itunes:episode` and "next lesson". |
| `title` | The lesson's subject, without the series prefix: `Pronunciation of /i/`, `Gostar vs. Gustar`. |
| `topic` | Optional. The cultural topic after the comma in the original title: `Getting the Check at a Restaurant`. Supplementary lessons have none. |
| `date` | The original publication date shown on the lesson page (`YYYY-MM-DD`). |
| `audio.url` | Opaque: a root-relative path (`/mp3/…`) or an absolute `http(s)` URL. Code never parses it, so moving media is a data change. |
| `audio.durationSeconds` | Integer seconds (`10:32` → 632). |
| `audio.bytes` | The MP3's exact size in bytes (the feed's enclosure `length`). |
| `pdf.url` | Same rules as `audio.url`. |
| `pdf.bytes` | The PDF's exact size in bytes, shown beside the transcript link ("PDF, 151 KB"). |
| `photo` | Optional. `url` (same rules) and `alt`, which must be non-empty. |
| body | The intro, in Markdown. Must not be empty. |

Unknown fields are rejected. Uniqueness of `episode` and of `series` + `number`, and the non-empty body, are checked across entries by `getLessons()` in `src/lib/lessons.ts`, which fails the build with the two clashing file names.

## Portuguese and Spanish words in the intro

The intros italicise Portuguese words, Spanish words, names and plain emphasis alike, so the language
of an italic can't be inferred. Mark it with inline HTML, which Markdown passes through as is:

| Write | For | Shown as |
| --- | --- | --- |
| `<i lang="pt-BR">também não</i>` | A Portuguese word or phrase | Italic, in the accent colour, weight 500 |
| `<i lang="es">tampoco</i>` | A Spanish word or phrase | Plain italic |
| `*will*` | English emphasis, a name, anything else | Plain italic (`<em>`) |

```md
Spanish speakers who are used to saying <i lang="es">tampoco</i> will now have to learn how to say <i lang="pt-BR">também não</i> in Portuguese.
```

Markdown still works inside the tags (`<i lang="es">María quiere **me** ayudar</i>`). The `lang`
lets screen readers switch voice and browsers hyphenate and pick quotes for the right language, and the
feed's episode descriptions carry it too. Use exactly `pt-BR` or `es`: `getLessons()` fails the build on
any other `lang` in an intro. A word that is the same in both languages takes the language of the
sentence it is quoted from (`<i lang="es">esquisito</i>` in Spanish means exquisite).

## Helpers

`src/lib/notes.ts`: `getAllNotes()`, `getNotes(lesson)` (its notes with any shared dialog resolved). `src/lib/lessons.ts`: `getLessons()` (all, episode order), `lessonsBySeries(series)`, `getLesson(series, number)`, `nextLesson(lesson)` (next by episode, across series) and `lessonPath({ series, number })`.

## Fixtures

The three entries on `main` before the extraction (#3) are fixtures. `pronunciation-01.md` is the real Lesson 1. `grammar-01.md` and `supplementary-01.md` have their real title, date and intro, but point at Lesson 1's MP3 and PDF. The extraction replaces all three.

# Notes schema

A lesson's study notes (#88: the dialog and teaching notes the original PDFs held) are one Markdown file in `src/content/notes/`, named like its lesson (`pronunciation-01.md`). The frontmatter is checked by the Zod schema in `src/content.config.ts`; the body holds the notes. The lesson page shows **Dialog** (or **Clips**), then the body, then "Original lesson on COERLL".

```md
---
source: https://www.coerll.utexas.edu/brazilpod/tafalado/lesson-01.html
dialog:
  - speaker: Valdo
    pt: "Qu<mark>e</mark> b<mark>i</mark>f<mark>e</mark> gostoso."
    es: "Qué biftec sabroso."
    en: "What a tasty steak."
---

## Cultural notes

In many restaurants in the US …

## Pronunciation notes

This dialog focuses on the sound <span lang="pt-BR-fonipa">/i/</span> …
```

| Field | Rule |
| --- | --- |
| `source` | The episode's lesson page on COERLL, as in SOURCES.md (`lesson-01.html`, `lesson-gra02.html`, `lesson-suppl01.html`). The page, not the PDF. |
| `dialog` | A list of turns: `speaker` (one of `SPEAKERS` in `src/content.config.ts`: Valdo, Michelle, Vivian, Orlando, José Luis; add names there), `pt`, `es`, `en`, none empty. |
| `dialog` (shared) | Instead of turns, `{ from: <notes id>, speakers?: [...] }`: the dialog stored in another lesson's notes (the alternate takes 10/11, 12/13, 14/15 store it once, in the first). `speakers`, if given, recasts it with one speaker per turn (Pronunciation 13's guest Vivian). The named notes must have turns of their own. |
| `clips` | Pronunciation 24 only, instead of `dialog`: a list of `{ heading, speakers: [...], lines: [pt, …], translation?: { es, en }, observations }`. |
| body | Markdown: `## Cultural notes`, then `## Pronunciation notes` or `## Grammar notes`, in the PDF's order. Must not be empty. Leave out the PDFs' banner, footer and "These notes accompany…" line. |

A notes file has a `dialog` or `clips`, never both. Unknown fields are rejected. `getAllNotes()` in `src/lib/notes.ts` (checks in `src/lib/notes-check.ts`) fails the build, naming the file, on: unbalanced `<mark>`; a `lang` outside the rules below; any tag but `<mark>`, `<i>`, `<em>` and `<span>` in dialog or clip strings; notes with no lesson; a shared dialog that can't be resolved; and, once `REQUIRE_NOTES_FOR_EVERY_LESSON` is on, a lesson with no notes. Until then a lesson without notes keeps its PDF link.

## Markup in notes

- **Highlights.** The sounds or forms a lesson teaches (red in the PDFs) are `<mark>`, in dialog strings and the body: `b<mark>i</mark>f<mark>e</mark>`. Their style is one rule in `src/styles/base.css`.
- **Words** follow the intro rules above: `<i lang="pt-BR">`, `<i lang="es">`, `*…*` for English.
- **IPA** is `<span lang="pt-BR-fonipa">[ej]</span>`, or `es-fonipa` / `en-fonipa` when the symbol is about Spanish or English sounds.
- Those five values are the only `lang` allowed in notes. Dialog lines get `pt-BR`, `es` and `en` from the page.

## Tables

Ordinary GFM tables. Each column header sets the `lang` of every cell below it (`src/lib/table-lang.ts`, a Sätteri hast plugin in `astro.config.ts`). Headers are matched ignoring case:

| Header | Cells get |
| --- | --- |
| `Portuguese` | `pt-BR` |
| `Spanish` | `es` |
| `English` | `en` |
| `Symbol`, `Symbol (Portuguese)` | `pt-BR-fonipa` |
| `Symbol (Spanish)` | `es-fonipa` |
| `Symbol (English)` | `en-fonipa` |
| `Notes`, `Examples` | Nothing: mixed content, marked inline with `<i lang>` / `<span lang>` |

Any other header fails the build with the file name, so no table ships untagged. Add a header to `COLUMN_LANG` only with its language.
