import { describe, expect, it } from 'vitest';
import { findInCues } from './find-in-cues';

const texts = ['Ação, coração e ação.', 'O ingresso', 'Você: VOCÊ'];
const found = (query: string) => findInCues(texts, query).map(({ cue, start, end }) => `${cue}:${texts[cue]!.slice(start, end)}`);

describe('find in cues', () => {
  it('finds every occurrence, several on one line, in order', () => {
    expect(found('ção')).toEqual(['0:ção', '0:ção', '0:ção']);
  });

  it('ignores accents and case', () => {
    expect(found('acao')).toEqual(['0:Ação', '0:ação', '0:ação']); // the middle one inside "coração"
    expect(found('CORACAO')).toEqual(['0:coração']);
    expect(found('voce')).toEqual(['2:Você', '2:VOCÊ']);
  });

  it('finds nothing for no match or a blank query', () => {
    expect(found('cinema')).toEqual([]);
    expect(found('  ')).toEqual([]);
  });
});
