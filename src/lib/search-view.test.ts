import { describe, expect, it } from 'vitest';
import { searchView, type SearchViewInput } from './search-view';
import type { TranscriptHit } from './transcript-search';

// Six rows: four pronunciation lessons, then two grammar lessons.
const rowLessons = ['/pronunciation/01', '/pronunciation/02', '/pronunciation/03', '/pronunciation/04', '/grammar/01', '/grammar/02'];
const rowSeries = ['pronunciation', 'pronunciation', 'pronunciation', 'pronunciation', 'grammar', 'grammar'];
const hit = (lesson: string, start: number): TranscriptHit => ({ lesson, start, text: 'o coração', ranges: [2, 9] });

const view = (input: Partial<SearchViewInput>) =>
  searchView({ query: 'coracao', matches: [], rowLessons, rowSeries, series: null, hits: [], lineLimit: 50, ...input });
const groups = (v: ReturnType<typeof searchView>) => v.groups.map((g) => [g.row, g.hits.map((h) => h.start)]);

describe('search view', () => {
  it('shows the lessons the filter matches, as the plain filter does, whatever the transcripts match', () => {
    const v = view({ matches: [3, 1], hits: [hit('/pronunciation/01', 4), hit('/grammar/01', 1)] });
    expect(v.hidden).toEqual([true, false, true, false, true, true]);
    expect(v.counts).toEqual({ pronunciation: 2, grammar: 0 });
  });

  it('groups the lines: matched lessons first, best first, then the rest by how many lines match', () => {
    const v = view({
      matches: [3, 1],
      hits: [
        hit('/pronunciation/01', 4),
        hit('/pronunciation/02', 6),
        hit('/pronunciation/04', 2),
        hit('/grammar/01', 1),
        hit('/grammar/01', 8),
      ],
    });
    expect(groups(v)).toEqual([
      [3, [2]],
      [1, [6]],
      [4, [1, 8]],
      [0, [4]],
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

  it('narrows the lines to the pressed series pill, and keeps the pills of series with lines', () => {
    const hits = [hit('/pronunciation/02', 1), hit('/grammar/01', 2)];
    expect(groups(view({ matches: [0], hits, series: 'grammar' }))).toEqual([[4, [2]]]);
    // Grammar has no lesson match, but it has a line, so its pill stays to narrow to it.
    expect(view({ matches: [0], hits }).pills).toEqual({ pronunciation: true, grammar: true });
  });

  it('says how many lessons and lines match', () => {
    expect(view({ matches: [0], hits: [hit('/pronunciation/01', 1), hit('/grammar/01', 2)] }).status).toBe(
      '1 lesson matches, 2 lines in transcripts',
    );
    expect(view({ matches: [], hits: [hit('/grammar/01', 2)] }).status).toBe('0 lessons match, 1 line in transcripts');
    expect(view({ matches: [0, 4], hits: 'loading' }).status).toBe('2 lessons match. Searching transcripts…');
  });

  it('offers to clear the filter when neither the lessons nor the transcripts match', () => {
    const v = view({ matches: [], hits: [] });
    expect(v.status).toBe('No lessons match.');
    expect(v.empty).toBe(true);
    expect(view({ matches: [], hits: [hit('/grammar/01', 2)] }).empty).toBe(false);
    expect(view({ matches: [], hits: 'loading' }).empty).toBe(false);
  });

  it('is the plain lesson filter below two characters', () => {
    const v = view({ query: 'c', matches: [0, 4], hits: [hit('/pronunciation/02', 1)] });
    expect(v.transcripts).toBe(false);
    expect(v.hidden).toEqual([false, true, true, true, false, true]);
    expect(v.groups).toEqual([]);
    expect(v.status).toBe('2 lessons match');
  });
});
