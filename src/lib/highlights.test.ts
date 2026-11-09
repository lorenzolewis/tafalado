import { describe, expect, it } from 'vitest';
import { highlightLegend } from './highlights';

describe('highlightLegend', () => {
  it('names a single red set by what the series teaches', () => {
    expect(highlightLegend('pronunciation-01', 'pronunciation', ['Que b<mark>i</mark>fe.'])).toEqual([
      { colour: 'red', label: 'The sound this lesson teaches' },
    ]);
    expect(highlightLegend('grammar-02', 'grammar', ['<mark>do</mark> carro'])).toEqual([
      { colour: 'red', label: 'The forms this lesson teaches' },
    ]);
  });

  it('gives each colour in the lines its label, red first', () => {
    const lines = ['t<mark class="blue">á</mark>', 'fil<mark>a</mark>'];
    expect(highlightLegend('pronunciation-05', 'pronunciation', lines, { red: 'Reduced', blue: 'Full' })).toEqual([
      { colour: 'red', label: 'Reduced' },
      { colour: 'blue', label: 'Full' },
    ]);
  });

  it('has nothing to explain when the lines have no highlights', () => {
    expect(highlightLegend('pronunciation-24', 'pronunciation', ['Sem nada.'])).toEqual([]);
  });

  it('fails the build on a blue or green set with no label, naming the file', () => {
    expect(() => highlightLegend('grammar-11', 'grammar', ['<mark class="blue">elas</mark>'])).toThrow(
      /Notes "grammar-11".*blue.*highlights/,
    );
  });

  it('fails the build on a label for a colour the lines never use', () => {
    expect(() =>
      highlightLegend('pronunciation-03', 'pronunciation', ['<mark>ê</mark>'], { red: 'Closed', green: 'Open' }),
    ).toThrow(/Notes "pronunciation-03".*green/);
  });
});
