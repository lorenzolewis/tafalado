// What the sidebar's lesson filter shows (#20, #7, #106): the lessons whose title, topic or intro
// match, exactly as filterView (src/lib/lesson-filter.ts) shows them, and below them the matching
// transcript lines, grouped by episode. A pure function of the query's matches;
// src/lib/sidebar-ui.ts puts it on the page.
import { filterView, type FilterView, type FilterViewInput } from './lesson-filter';
import { MIN_TRANSCRIPT_QUERY, type TranscriptHit } from './transcript-search';

/** How many transcript lines show at first, and how many more each "Show more lines" adds. */
export const LINE_PAGE = 50;

export interface SearchViewInput extends FilterViewInput {
  /** Indexes of the rows the lesson filter matches, best first. */
  matches: number[];
  /** Each row's lesson path, in row order. */
  rowLessons: readonly string[];
  /** The query's transcript lines; 'loading' while the transcripts download. */
  hits: TranscriptHit[] | 'loading';
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
  /** The query is long enough to search transcripts: the In transcripts section shows. */
  transcripts: boolean;
  /**
   * The lines shown, grouped by episode: lessons the filter matches first (best first), then those
   * only the transcripts match, by how many lines match.
   */
  groups: HitGroup[];
  /** How many matching lines aren't shown, for "Show more lines". */
  moreLines: number;
  /** The transcripts are still downloading. */
  loading: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** What the sidebar shows for a query, a series pill and the transcript lines it matches. */
export function searchView(input: SearchViewInput): SearchView {
  const { query, matches, rowLessons, rowSeries, series, hits, lineLimit } = input;
  const lessons = filterView(input);
  if (query.trim().length < MIN_TRANSCRIPT_QUERY) {
    return { ...lessons, transcripts: false, groups: [], moreLines: 0, loading: false };
  }
  const loading = hits === 'loading';

  // Each row's lines, in the pressed pill's series.
  const rowOf = new Map(rowLessons.map((lesson, i) => [lesson, i]));
  const linesOf = new Map<number, TranscriptHit[]>();
  for (const h of loading ? [] : hits) {
    const row = rowOf.get(h.lesson);
    if (row === undefined || (series !== null && rowSeries[row] !== series)) continue;
    if (!linesOf.has(row)) linesOf.set(row, []);
    linesOf.get(row)!.push(h);
  }
  const matched = new Set(matches);
  const transcriptOnly = [...linesOf.keys()]
    .filter((row) => !matched.has(row))
    .sort((a, b) => linesOf.get(b)!.length - linesOf.get(a)!.length || a - b);

  const groups: HitGroup[] = [];
  let shown = 0;
  let total = 0;
  for (const row of [...matches, ...transcriptOnly]) {
    const rowHits = linesOf.get(row);
    if (!rowHits) continue;
    total += rowHits.length;
    const room = Math.max(0, lineLimit - shown);
    if (room === 0) continue;
    groups.push({ row, hits: rowHits.slice(0, room) });
    shown += Math.min(room, rowHits.length);
  }

  // A series with matching lines keeps its pill, so the lines can be narrowed to it too.
  const pills = { ...lessons.pills };
  if (series === null) for (const row of linesOf.keys()) pills[rowSeries[row]!] = true;

  const lessonCount = lessons.hidden.filter((h) => !h).length;
  const empty = lessonCount === 0 && total === 0 && !loading;
  const status = empty
    ? 'No lessons match.'
    : `${plural(lessonCount, 'lesson matches', 'lessons match')}` +
      (loading ? '. Searching transcripts…' : `, ${plural(total, 'line', 'lines')} in transcripts`);

  return { ...lessons, pills, status, empty, transcripts: true, groups, moreLines: total - shown, loading };
}
