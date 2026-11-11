# Searching episode transcripts in the browser

Research notes for #7 and #106, November 2026. Library versions checked: Pagefind 1.6.0, MiniSearch 7.2.0, FlexSearch 0.8.212, Orama 3.1.18, Lunr 2.3.9, uFuzzy 1.0.19.

## Question

What is the best way to search the 46 episode transcripts with no backend, for two jobs?

1. **Global search** (the home page filter, widened). Show the top 3 matching **episodes** with a "Show more episodes" button. Below them, list the matching **transcript lines** with timestamps. Each line opens the episode and seeks the player.
2. **Find in transcript** inside the one episode the player has loaded. Highlight the matches, step between them, and seek.

Matching must ignore accents for Portuguese and Spanish words (#7).

## Recommendation

- **Global engine: a prebuilt cue file plus uFuzzy, the library the site already uses.** At build time, write one `/data/transcript-search.json` holding `[lesson, start, plain text]` for every cue: 8,726 cues, 162 KB gzipped. Fetch it the first time the learner turns on "Also search transcripts" (#106). Then run the same `uFuzzy({ intraMode: 1 })` + `latinize()` setup as `src/lib/lesson-filter.ts` over the cue texts. Cues are at most two 65-character lines, which is the "short-to-medium phrases" haystack uFuzzy is built for ([uFuzzy README](https://github.com/leeoniya/uFuzzy)). A query takes about 1–3 ms over all cues (measured below). The learner gets the same typo tolerance and accent folding as the lesson filter, and uFuzzy gives match ranges for `<mark>` highlights ([README](https://github.com/leeoniya/uFuzzy)). The site needs no new dependency and no extra build tool.
- **Runner-up: MiniSearch** (6 KB gzipped), if relevance ranking across episodes turns out to matter. Build its index in the browser from the same JSON; that took 72 ms in Node. **Pagefind works but suits this site less well.** It shines when a large site must not download its whole index ([Pagefind API docs](https://pagefind.app/docs/api/)). Here the whole corpus costs about the same as Pagefind's first query (see the measurements). Pagefind has no typo tolerance, and it would add a native build binary.
- **Find in transcript: a plain scan, no library.** The player already has the episode's cues from `/data/transcripts/<id>.json` (`src/lib/transcript-ui.ts`). Fold each cue's text and the query with NFD plus combining-mark removal, then use `indexOf` for every occurrence. The largest episode has 278 cues, and 1,000 scans of it took 6 ms. The folding never changes string length on these files (verified on all 8,726 cues). So match offsets can be used directly on the original text to place `<mark>`.
- **Layout:** compute episodes and lines from two sources.
  - **Episodes:** first the lessons the existing lesson filter matches (title, topic, intro), in uFuzzy order. Then the lessons that only the transcripts match, ordered by how many cues hit. Show 3, and add the rest behind "Show more episodes".
  - **Transcript lines:** the matching cues, grouped by episode in that same order, each as `m:ss` plus the highlighted text. Each line is a button that calls the player's existing `seekTo(lesson, seconds)`, which already loads another lesson first (`src/lib/transcript-ui.ts`).
  - **Limits:** cap the lines shown, for example 50 with "Show more". Require 2 or more characters before searching transcripts: the one-letter query "e" hits 7,848 cues, and uFuzzy advises ranking only result sets of 1,000 or fewer ([README](https://github.com/leeoniya/uFuzzy)).
- **Persistence:** if the checkbox remembers its state, keep it in `localStorage` like the other device-local preferences (`docs/adr/0004-no-accounts-device-local-progress.md`).

## Comparison

Global search over all 8,726 cues. Sizes were measured locally (see [Measurements](#local-measurements)); "gz" is `gzip -9`.

| Option | Library (min+gz) | Data to download | Accent folding | Prefix / typo | Per-cue hit + highlight |
|---|---|---|---|---|---|
| **uFuzzy + cue JSON** | 4.4 KB (already a dependency) | 162 KB, one file | `latinize()` ([README](https://github.com/leeoniya/uFuzzy)) | substring matching, 1 typo per term with `intraMode: 1` ([README](https://github.com/leeoniya/uFuzzy)) | yes: every cue is a haystack item, and `info.ranges` + `highlight()` mark the matches |
| MiniSearch + cue JSON | 6.1 KB | 162 KB, built in the browser (72 ms in Node); a serialized index is bigger at 270 KB | via `processTerm` (it only lowercases by default) ([README](https://github.com/lucaong/minisearch)) | `prefix: true`, `fuzzy: 0.2` ([README](https://github.com/lucaong/minisearch)) | per-cue documents yes; results report the matched terms, but you write the highlighting yourself (none in the README) |
| Pagefind | 13 KB JS + 12 KB worker + 60 KB wasm | 7 index chunks, 195 KB in all, fetched by prefix; plus about 6 KB per episode fragment | on by default; `exactDiacritics` turns it off ([search config](https://pagefind.app/docs/search-config/)) | prefix yes; no typo tolerance (tested: when nothing matches, it falls back to a shorter prefix, so "corazao" matched "cor") | yes, via sub-results: an element with `id` + `data-pagefind-title` ([sub-results](https://pagefind.app/docs/sub-results/)), with `<mark>` excerpts |
| FlexSearch | 17.6 KB (full bundle) | 465 KB exported index | "Charset normalization" in the Latin encoders ([README](https://github.com/nextapps-de/flexsearch)); "coracao" found "coração" | `tokenize: 'forward'` prefix; "corazao" found nothing in the test | highlighting is in the bundle and compact builds ([README](https://github.com/nextapps-de/flexsearch)) |
| Orama | 25.8 KB | 1,181 KB `save()` output | `replaceDiacritics` in its tokenizer ([source](https://github.com/oramasearch/orama/tree/main/packages/orama/src/components/tokenizer)), but the default English splitter `/[^A-Za-zàèéìòóù0-9_'-]+/` cuts "coração" into pieces, so you must choose the `portuguese` or `spanish` tokenizer ([languages.ts](https://github.com/oramasearch/orama/blob/main/packages/orama/src/components/tokenizer/languages.ts)) | `tolerance` (typos) | — |
| Lunr | 8.9 KB | 500 KB serialized index | none by default (the test folded the text first) | wildcards and edit distance ([README](https://github.com/olivernn/lunr.js)) | — ; last npm publish 2023-07 (2.3.9) (`npm view lunr`) |

## Findings per option

### Pagefind

- **Cue-level hits work, through HTML rather than custom records.**
  - `addCustomRecord` takes only `url`, `content`, `language`, `meta`, `filters` and `sort`. Its docs mention no anchors or sub-results ([Node API](https://pagefind.app/docs/node-api/)).
  - `addHTMLFile` takes a virtual HTML page and indexes it like a real one ([Node API](https://pagefind.app/docs/node-api/)).
  - Sub-results come from headings with an `id`, or from any element with an `id` and a `data-pagefind-title`. Each sub-result has a `url#fragment`, a `title`, a highlighted `excerpt` and an `anchor`. The sections with the most hits come first ([sub-results](https://pagefind.app/docs/sub-results/)).
  - Tested: one virtual page per episode, with each cue as `<p id="t365" data-pagefind-title="6:04">`. Searching "ingresso" returned `/pronunciation-13/#t365`, titled `6:04`, with the excerpt "Eu estou com dois `<mark>`ingressos`</mark>`…".
  - Lesson pages don't render transcripts (`docs/transcripts.md`), so running `pagefind --site dist` over the built site would not find the transcripts. You would need a Node API step in an Astro integration's `astro:build:done` hook ([Astro integrations API](https://docs.astro.build/en/reference/integrations-reference/#astrobuilddone)).
- **Accents:** folded by default. `ranking.diacriticSimilarity` (default 0.8) only boosts exact-accent matches ([ranking](https://pagefind.app/docs/ranking/)). Tested: "coracao" and "coração" both find the cue in Pronunciation 18.
- **Languages:** Pagefind builds a separate index for each `<html lang>`, and stemming follows the page language. Portuguese and Spanish are both supported ([multilingual](https://pagefind.app/docs/multilingual/)). The transcripts mix all three languages inside one episode, so the test forced one index with `forceLanguage: 'en'`, and English stemming then applies to the Portuguese words. The docs say nothing about mixed-language pages ([multilingual](https://pagefind.app/docs/multilingual/)).
- **Lazy loading:**
  - `search()` returns stubs. Each `result.data()` fetches that one page's fragment ([JS API](https://pagefind.app/docs/api/)).
  - Index chunks are split alphabetically, and `preload()` or `debouncedSearch` fetch them early ([JS API](https://pagefind.app/docs/api/)).
  - A broad query such as "você" (35 episodes, 284 sub-results) loads 35 fragments, about 220 KB. So call `data()` only for the episodes on screen.
- **Ranking controls:** `termFrequency`, `termSimilarity`, `pageLength`, `termSaturation`, `diacriticSimilarity` and `metaWeights` ([ranking](https://pagefind.app/docs/ranking/)).
- **Grouping:** this matches Pagefind's model, with an episode as the page result and its cues as `sub_results`. But Pagefind would rank episodes by transcript text only. The "top episodes" list should still put the lesson filter's title and topic matches first.

### MiniSearch

Prefix search, fuzzy search (edit distance as a fraction of term length), and `processTerm` for normalizing each term. It lowercases terms by default, with no stemming and no stop words ([README](https://github.com/lucaong/minisearch)). Tested with `processTerm` folding via NFD: "coracao" and the typo "corazao" both found the 2 matching cues. It has `loadJSON`/`loadJSAsync` for a prebuilt index (`dist/es/index.d.ts`), but the serialized index (270 KB gz) is bigger than the raw cues (162 KB gz). Building in the browser is the better trade.

### FlexSearch, Orama, Lunr

None beats the two options above for this corpus. Their serialized indexes are 3–7 times the size of the raw cue JSON (table). Orama's default tokenizer breaks Portuguese words, and Lunr has had no release since 2.3.9.

### Extending uFuzzy (recommended)

- **The haystack fits.** The README targets "a relatively short search phrase (needle) against a large list of short-to-medium phrases (haystack)". It also reports a 162,000-phrase search in 5 ms, with no index to build ([README](https://github.com/leeoniya/uFuzzy)). The 8,726 cues are well within that.
- **The matching matches the lesson filter.** It uses the same `latinize()` and the same single-typo `intraMode: 1` as `src/lib/lesson-filter.ts`.
- **The costs:**
  - uFuzzy doesn't rank relevance across documents; per-episode hit counts are the site's own code.
  - Very short queries hit thousands of cues, so sort only result sets of 1,000 or fewer, as the README advises ([README](https://github.com/leeoniya/uFuzzy)).
  - The `permute` argument multiplies the searches: 3 words give 3! = 6 ([README](https://github.com/leeoniya/uFuzzy)). The existing `MAX_PERMUTED_WORDS = 3` cap applies here too.

## Find in transcript (one episode)

- **The engine is a plain scan.** An episode has 76–278 cues and at most 14,321 characters of text. A folded `includes`/`indexOf` scan is effectively instant (6 ms per 1,000 scans of the largest episode). For typo tolerance, run uFuzzy over the episode's cues instead; that is also fast at this size.
- **Highlighting:** the cue HTML holds `<i lang>` spans (`src/lib/transcript.ts`). So find matches in each line's `textContent` and wrap them with `Range`/`<mark>`; `<mark>` is HTML's element for text highlighted for relevance ([HTML spec](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-mark-element)). Because the folding keeps length (verified), offsets in the folded text equal offsets in the original.
- **Accessibility:** the WAI-ARIA APG has no find-in-page pattern ([APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)). The relevant pieces:
  - Wrap the field in the HTML `<search>` element, which creates a search landmark. Give it a unique label, such as "Search this transcript", because the sidebar already has `<search id="lesson-search">`; APG says each search landmark on a page needs a unique label ([APG search landmark](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/search.html)).
  - Announce "3 of 12" in a `role="status"` live region, as the sidebar does with `#lesson-filter-status`. `status` is a polite live region ([WAI-ARIA 1.2 `status`](https://www.w3.org/TR/wai-aria-1.2/#status)).
  - Keys, following browser find bars rather than any spec: Enter and Shift+Enter for next and previous, and Escape to close. Keep focus in the field and scroll the current match into view. Seek on explicit activation only (the line's own button, or a "Play from here" control), not on every step. Each cue is already a seek button (`docs/transcripts.md`).

## Accent-insensitive matching

- **Use this for substring search:** `s.normalize('NFD')` splits precomposed letters into base + combining marks ([MDN `normalize`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize); [ECMA-262](https://tc39.es/ecma262/#sec-string.prototype.normalize)). Then `.replace(/\p{M}/gu, '')` removes the marks, and `.toLowerCase()` drops case. That turns á ã â ç é ê í ñ ó õ ô ú ü into base letters. MDN suggests NFKD/NFKC when compatibility characters such as ligatures should match ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize)); these files have none that change length. uFuzzy's `latinize()` does the same job, and it is what the site already uses.
- **Not for substring search:** `Intl.Collator(locale, { sensitivity: 'base' })`. There, "only strings that differ in base letters compare as unequal", and `usage: 'search'` tests "a full-string match against a key" ([MDN Collator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator/Collator); [ECMA-402 Collator](https://tc39.es/ecma402/#collator-objects)). It compares whole strings and has no "find inside", so it suits word-equality checks only.
- **One trade-off:** folding makes "ano" match "año" and "pais" match "país". Pagefind makes the same trade by default, and so does the current filter.

## Local measurements

Run on 2026-11-10 over `public/transcripts/*.vtt`. The scripts are in the session scratchpad; the repo was not changed.

| Measure | Value |
|---|---|
| Files | 46, 927,896 bytes (7.3–28.5 KB each, average 20 KB) |
| Cues | 8,726 (76–278 per episode) |
| Words | 86,106; 4,719 distinct after folding |
| Plain cue text | 456 KB, 124 KB gz |
| Cue JSON `[lesson, start, text]` | 669 KB, 162 KB gz |
| Files not in NFC / whose folded length differs | 0 / 0 |
| uFuzzy over all cues, `intraMode: 1` | "coracao" 3.4 ms (2 hits); "voce" 1.9 ms (306); "e" 0.4 ms (7,848) |
| MiniSearch | built in 72 ms; serialized 981 KB, 270 KB gz; query 1.1 ms |
| Lunr / FlexSearch / Orama serialized | 500 / 465 / 1,181 KB gz |
| Pagefind 1.6.0 output (one virtual page per episode, each cue an anchor) | 1.2 MB on disk; 7 index chunks, 195 KB in all; 46 fragments, about 6.3 KB each; `pagefind.js` 13 KB gz, worker 12 KB gz, wasm 60 KB |
| Library min+gz (esbuild) | uFuzzy 4.4 KB, MiniSearch 6.1 KB, Lunr 8.9 KB, FlexSearch 17.6 KB, Orama 25.8 KB |

## Open questions and risks

- **How episodes are ranked:** lesson-filter matches first, then transcript hit counts, is a design choice. uFuzzy gives no cross-document relevance score, so check it on real queries ("você", "nh", "ficar"). If it feels wrong, switch the transcript side to MiniSearch for scored ranking.
- **Noise from short or common queries:** set a minimum length, cap the lines shown, and maybe skip English stop words on the transcript side only.
- **Whether to search English:** the cue text is mostly English explanation. Searching only the `<lang>` spans would cut the noise, but #106 leaves this open. Leaving out English would also hide hits like "N-H".
- **Payload:** 162 KB gz loads on first use only. The build can split it per series if that matters on phones.
- **Building the file:** `getAllTranscripts()` already parses every VTT at build time. Add one more static JSON route next to `src/pages/data/transcripts/[id].json.ts`, keeping it outside `/transcripts/` as `docs/transcripts.md` requires.
- **Speed on phones:** the timings are from a desktop machine (Node and Chromium) and weren't measured on a phone.

## Sources

- Pagefind: [JS API](https://pagefind.app/docs/api/), [Node API](https://pagefind.app/docs/node-api/), [sub-results](https://pagefind.app/docs/sub-results/), [search config](https://pagefind.app/docs/search-config/), [ranking](https://pagefind.app/docs/ranking/), [multilingual](https://pagefind.app/docs/multilingual/), [repo](https://github.com/CloudCannon/pagefind)
- [uFuzzy README](https://github.com/leeoniya/uFuzzy)
- [MiniSearch README](https://github.com/lucaong/minisearch); `minisearch/dist/es/index.d.ts` (7.2.0)
- [FlexSearch README](https://github.com/nextapps-de/flexsearch)
- Orama tokenizer source: [directory](https://github.com/oramasearch/orama/tree/main/packages/orama/src/components/tokenizer), [languages.ts](https://github.com/oramasearch/orama/blob/main/packages/orama/src/components/tokenizer/languages.ts)
- [Lunr README](https://github.com/olivernn/lunr.js); `npm view lunr`
- [Astro integrations API, `astro:build:done`](https://docs.astro.build/en/reference/integrations-reference/#astrobuilddone)
- Text normalization and collation: [MDN `String.prototype.normalize`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize), [ECMA-262 `normalize`](https://tc39.es/ecma262/#sec-string.prototype.normalize), [MDN `Intl.Collator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator/Collator), [ECMA-402 Collator objects](https://tc39.es/ecma402/#collator-objects)
- Accessibility and markup: [APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/), [APG search landmark](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/search.html), [WAI-ARIA 1.2 `status`](https://www.w3.org/TR/wai-aria-1.2/#status), [HTML `mark`](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-mark-element)
- In the repo: `src/lib/lesson-filter.ts`, `src/lib/transcript.ts`, `src/lib/transcript-ui.ts`, `src/components/Sidebar.astro`, `docs/transcripts.md`, `docs/adr/0004-no-accounts-device-local-progress.md`; issues #7, #106
