// What the sidebar's lesson filter shows when it also searches transcripts (#7, #106): the matching
// episodes, then the matching transcript lines grouped by episode. A pure function of the query's
// matches, like filterView (src/lib/lesson-filter.ts), which it falls back to when transcripts
// aren't searched. src/lib/sidebar-ui.ts puts it on the page.
import { filterView, type FilterView, type FilterViewInput } from './lesson-filter';
import { MIN_TRANSCRIPT_QUERY, type TranscriptHit } from './transcript-search';

/** How many episodes show before "Show more episodes". */
export const TOP_EPISODES = 3;
/** How many transcript lines show at first, and how many more each "Show more lines" adds. */
export const LINE_PAGE = 50;

export interface SearchViewInput extends FilterViewInput {
  /** Indexes of the rows the lesson filter matches, best first. */
  matches: number[];
  /** Each row's lesson path, in row order. */
  rowLessons: readonly string[];
  /** The query's transcript lines; null when transcripts aren't searched, 'loading' while they download. */
  hits: TranscriptHit[] | null | 'loading';
  /** "Show more episodes" was pressed. */
  allEpisodes: boolean;
  /** How many transcript lines to show. */
  lineLimit: number;
}

/** One episode's matching lines, under its name. */
export interface HitGroup {
  /** The episode's row. */
  row: number;
  hits: TranscriptHit[];
}

export interface SearchView extends FilterView {
  /** The Episodes and In transcripts sections show. */
  transcripts: boolean;
  /** Every row index, in the order the list shows them (hidden ones too). */
  order: number[];
  /** How many matching episodes are past the top ones, for "Show more episodes". */
  moreEpisodes: number;
  /** The lines shown, grouped by episode, in the episodes' order. */
  groups: HitGroup[];
  /** How many matching lines aren't shown, for "Show more lines". */
  moreLines: number;
  /** The transcripts are still downloading. */
  loading: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** What the sidebar shows for a query, a series pill and the transcript lines it matches. */
export function searchView(input: SearchViewInput): SearchView {
  const { query, matches, rowLessons, rowSeries, series, hits, allEpisodes, lineLimit } = input;
  const rows = rowSeries.map((_, i) => i);
  if (hits === null || query.trim().length < MIN_TRANSCRIPT_QUERY) {
    return { ...filterView(input), transcripts: false, order: rows, moreEpisodes: 0, groups: [], moreLines: 0, loading: false };
  }
  const loading = hits === 'loading';

  // Each row's lines, and the rows only the transcripts match, by how many lines match.
  const rowOf = new Map(rowLessons.map((lesson, i) => [lesson, i]));
  const linesOf = new Map<number, TranscriptHit[]>();
  for (const h of loading ? [] : hits) {
    const row = rowOf.get(h.lesson);
    if (row === undefined) continue;
    if (!linesOf.has(row)) linesOf.set(row, []);
    linesOf.get(row)!.push(h);
  }
  const matched = new Set(matches);
  const transcriptOnly = [...linesOf.keys()]
    .filter((row) => !matched.has(row))
    .sort((a, b) => linesOf.get(b)!.length - linesOf.get(a)!.length || a - b);
  const all = [...matches, ...transcriptOnly];

  const counts: Record<string, number> = {};
  for (const id of rowSeries) counts[id] = 0;
  for (const row of all) counts[rowSeries[row]!]!++;
  const pills: Record<string, boolean> = {};
  for (const id in counts) pills[id] = series === null ? counts[id]! > 0 : id === series;

  const episodes = all.filter((row) => series === null || rowSeries[row] === series);
  const visible = new Set(allEpisodes ? episodes : episodes.slice(0, TOP_EPISODES));
  const listed = new Set(episodes);
  const order = [...episodes, ...rows.filter((row) => !listed.has(row))];

  const groups: HitGroup[] = [];
  let lines = 0;
  let total = 0;
  for (const row of episodes) {
    const rowHits = linesOf.get(row);
    if (!rowHits) continue;
    total += rowHits.length;
    const room = Math.max(0, lineLimit - lines);
    if (room === 0) continue;
    groups.push({ row, hits: rowHits.slice(0, room) });
    lines += Math.min(room, rowHits.length);
  }

  const status = loading
    ? `${plural(episodes.length, 'lesson matches', 'lessons match')}. Searching transcripts…`
    : episodes.length === 0
      ? 'No lessons match.'
      : `${plural(episodes.length, 'lesson matches', 'lessons match')}, ${plural(total, 'line', 'lines')} in transcripts`;

  return {
    hidden: rows.map((row) => !visible.has(row)),
    counts,
    pills,
    status,
    empty: episodes.length === 0 && !loading,
    transcripts: true,
    order,
    moreEpisodes: episodes.length - visible.size,
    groups,
    moreLines: total - lines,
    loading,
  };
}
