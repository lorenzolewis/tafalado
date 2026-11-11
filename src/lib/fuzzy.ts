// The one uFuzzy setup shared by the lesson filter (#20) and transcript search (#7). Accents are
// stripped from both sides with uFuzzy's own latinize(), so "acao" matches "ação"; uFuzzy already
// ignores case.
import uFuzzy from '@leeoniya/ufuzzy';

// intraMode 1 (SingleError) allows one typo per word: "corazao" still finds "coração".
export const fuzzy = new uFuzzy({ intraMode: 1 });
/** How many words of a query are permuted (3! = 6 searches); uFuzzy warns against going much higher. */
export const MAX_PERMUTED_WORDS = 3;

/** Accents off, for the haystack and the query alike. Never changes a string's length (tested). */
export const latinize = <T extends string[] | string>(text: T): T => uFuzzy.latinize(text);

export interface FuzzyMatch {
  /** Index into the haystack. */
  index: number;
  /** Highlight ranges in that text: [start0, end0, start1, end1, …]. */
  ranges: number[];
}

/**
 * Every haystack text the query matches, in uFuzzy's ranked order, with highlight ranges. Up to
 * MAX_PERMUTED_WORDS words are tried in every order, so "gas plurals" finds "Plurals … Gas Stations".
 * Null for a query with no terms (blank). `haystack` must already be latinized.
 */
export function fuzzySearch(haystack: string[], query: string): FuzzyMatch[] | null {
  const needle = latinize(query);
  // Info (the ranges and ranking) for every match, however many: the callers cap what they show.
  const [idxs, info, order] = fuzzy.search(haystack, needle, MAX_PERMUTED_WORDS, Infinity);
  if (!idxs) return null;
  if (info && order) return order.map((i) => ({ index: info.idx[i]!, ranges: info.ranges[i]! }));
  // More words than are permuted: uFuzzy only filters, so the ranges come from each word on its own.
  const ranges = new Map<number, number[]>(idxs.map((i) => [i, []]));
  for (const term of fuzzy.split(needle)) {
    const termInfo = fuzzy.info(idxs, haystack, term);
    termInfo.idx.forEach((index, k) => ranges.get(index)?.push(...termInfo.ranges[k]!));
  }
  return idxs.map((index) => ({ index, ranges: mergeRanges(ranges.get(index)!) }));
}

/** Sorted, with overlapping ranges joined. */
function mergeRanges(flat: number[]): number[] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < flat.length; i += 2) pairs.push([flat[i]!, flat[i + 1]!]);
  pairs.sort((a, b) => a[0] - b[0]);
  const out: number[] = [];
  for (const [start, end] of pairs) {
    if (out.length && start <= out.at(-1)!) out[out.length - 1] = Math.max(out.at(-1)!, end);
    else out.push(start, end);
  }
  return out;
}
