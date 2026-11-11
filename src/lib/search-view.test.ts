import { describe, expect, it } from 'vitest';
import { searchView, type SearchViewInput } from './search-view';
import type { TranscriptHit } from './transcript-search';

// Six rows: four pronunciation lessons, then two grammar lessons.
const rowLessons = ['/pronunciation/01', '/pronunciation/02', '/pronunciation/03', '/pronunciation/04', '/grammar/01', '/grammar/02'];
const rowSeries = ['pronunciation', 'pronunciation', 'pronunciation', 'pronunciation', 'grammar', 'grammar'];
const hit = (lesson: string, start: number): TranscriptHit => ({ lesson, start, text: 'o coração', ranges: [2, 9] });

const view = (input: Partial<SearchViewInput>) =>
  searchView({
    query: 'coracao',
    matches: [],
    rowLessons,
    rowSeries,
    series: null,
    hits: [],
    allEpisodes: false,
    lineLimit: 50,
    ...input,
  });
const shown = (v: ReturnType<typeof searchView>) => v.order.filter((i) => !v.hidden[i]);

describe('search view', () => {
  it('lists title, topic and intro matches first, then transcript-only lessons by how many lines match', () => {
    const v = view({
      matches: [3, 1],
      hits: [hit('/pronunciation/01', 4), hit('/grammar/01', 1), hit('/grammar/01', 8), hit('/pronunciation/04', 2)],
      allEpisodes: true,
    });
    expect(shown(v)).toEqual([3, 1, 4, 0]);
    // The rest follow, hidden, in their own order.
    expect(v.order).toEqual([3, 1, 4, 0, 2, 5]);
  });

  it('shows the top three episodes until asked for more', () => {
    const input = { matches: [0, 1, 2, 3, 4] };
    expect(shown(view(input))).toEqual([0, 1, 2]);
    expect(view(input).moreEpisodes).toBe(2);
    expect(shown(view({ ...input, allEpisodes: true }))).toEqual([0, 1, 2, 3, 4]);
    expect(view({ ...input, allEpisodes: true }).moreEpisodes).toBe(0);
  });

  it('groups the lines by episode, in the episodes’ order, past the top three too', () => {
    const v = view({
      matches: [5, 1, 2, 3],
      hits: [hit('/pronunciation/02', 1), hit('/pronunciation/04', 3), hit('/grammar/02', 7), hit('/pronunciation/02', 9)],
    });
    expect(v.groups.map((g) => [g.row, g.hits.map((h) => h.start)])).toEqual([
      [5, [7]],
      [1, [1, 9]],
      [3, [3]],
    ]);
  });

  it('caps the lines shown, and shows more on request', () => {
    const many = Array.from({ length: 30 }, (_, i) => hit('/pronunciation/01', i));
    const more = Array.from({ length: 30 }, (_, i) => hit('/grammar/01', i));
    const capped = view({ hits: [...many, ...more], lineLimit: 50 });
    expect(capped.groups.map((g) => g.hits.length)).toEqual([30, 20]);
    expect(capped.moreLines).toBe(10);
    expect(view({ hits: [...many, ...more], lineLimit: 100 }).moreLines).toBe(0);
  });

  it('narrows both sections to the pressed series pill', () => {
    const v = view({ matches: [0], hits: [hit('/pronunciation/02', 1), hit('/grammar/01', 2)], series: 'grammar' });
    expect(shown(v)).toEqual([4]);
    expect(v.groups.map((g) => g.row)).toEqual([4]);
    expect(v.counts).toEqual({ pronunciation: 2, grammar: 1 });
    expect(v.pills).toEqual({ pronunciation: false, grammar: true });
  });

  it('says how many episodes and lines match', () => {
    expect(view({ matches: [0], hits: [hit('/pronunciation/01', 1), hit('/grammar/01', 2)] }).status).toBe(
      '2 lessons match, 2 lines in transcripts',
    );
    expect(view({ matches: [0], hits: [] }).status).toBe('1 lesson matches, 0 lines in transcripts');
    expect(view({ matches: [0], hits: 'loading' }).status).toBe('1 lesson matches. Searching transcripts…');
  });

  it('offers to clear the filter when neither section matches', () => {
    const v = view({ matches: [], hits: [] });
    expect(v.status).toBe('No lessons match.');
    expect(v.empty).toBe(true);
    expect(view({ matches: [], hits: 'loading' }).empty).toBe(false);
  });

  it('is the plain lesson filter below two characters or with transcripts off', () => {
    for (const input of [{ query: 'c', matches: [0, 4] }, { query: 'coracao', matches: [0, 4], hits: null }]) {
      const v = view({ ...input, hits: input.hits === null ? null : [hit('/pronunciation/02', 1)] });
      expect(v.transcripts).toBe(false);
      expect(v.order).toEqual([0, 1, 2, 3, 4, 5]);
      expect(v.hidden).toEqual([false, true, true, true, false, true]);
      expect(v.groups).toEqual([]);
      expect(v.status).toBe('2 lessons match');
    }
  });
});
