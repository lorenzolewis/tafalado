// The sidebar's lesson filter (#20), over each lesson's title, topic and intro. The matching (accents
// and case ignored, one typo per word, words in any order) is src/lib/fuzzy.ts, shared with
// transcript search (src/lib/transcript-search.ts).
import { fuzzySearch, latinize } from './fuzzy';

/**
 * Takes each lesson's searchable text, returns a function from a query to the matching indexes,
 * best match first. A blank query keeps every lesson, in order.
 */
export function createLessonFilter(texts: string[]): (query: string) => number[] {
  const haystack = latinize(texts);
  const all = texts.map((_, i) => i);
  return (query) => fuzzySearch(haystack, query)?.map((m) => m.index) ?? all;
}

export interface FilterViewInput {
  /** What the learner typed. */
  query: string;
  /** Indexes of the rows the query matches, from createLessonFilter(). */
  matches: Iterable<number>;
  /** Each row's series id, in row order. */
  rowSeries: readonly string[];
  /** The pressed series pill, or null for every series. */
  series: string | null;
}

export interface FilterView {
  /** Per row: hidden by the query or the pill. */
  hidden: boolean[];
  /** Query matches per series, for the pill counts (ignoring the pressed pill). */
  counts: Record<string, number>;
  /** Per series: whether its pill shows: only the pressed one, or else those with matches. */
  pills: Record<string, boolean>;
  /** The live status line. */
  status: string;
  /** Nothing is shown: offer to clear the filter. */
  empty: boolean;
}

/** What the sidebar list shows for a query and a series pill (#53): the two combine. */
export function filterView({ query, matches, rowSeries, series }: FilterViewInput): FilterView {
  const hits = new Set(matches);
  const counts: Record<string, number> = {};
  for (const id of rowSeries) counts[id] = 0;
  const hidden = rowSeries.map((id, i) => {
    if (hits.has(i)) counts[id]!++;
    return !hits.has(i) || (series !== null && id !== series);
  });
  const shown = hidden.filter((h) => !h).length;
  const status = !query.trim()
    ? ''
    : shown === 0
      ? 'No lessons match.'
      : `${shown} ${shown === 1 ? 'lesson matches' : 'lessons match'}`;
  const pills: Record<string, boolean> = {};
  for (const id in counts) pills[id] = series === null ? !query.trim() || counts[id]! > 0 : id === series;
  return { hidden, counts, pills, status, empty: shown === 0 };
}
