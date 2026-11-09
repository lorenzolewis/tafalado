// What each highlight colour in a lesson's dialog means, for the legend under its "Show" controls
// (#93). Red alone needs no label: it is what the series teaches. A blue or green set contrasts with
// it (Pronunciation 3: closed and open e), so the notes name every colour (`highlights`,
// docs/lesson-schema.md), and the build fails on a colour without a label or a label without a colour.
// Pure, so unit tests reach it without astro:content.
import type { Highlights } from './notes-schema';
import type { Series } from './series';

export type HighlightColour = keyof Highlights;
export type LegendEntry = { colour: HighlightColour; label: string };

const COLOURS: readonly HighlightColour[] = ['red', 'blue', 'green'];

const DEFAULT_RED: Record<Series, string> = {
  pronunciation: 'The sound this lesson teaches',
  grammar: 'The forms this lesson teaches',
  supplementary: 'What this lesson teaches',
};

/** The colours of the `<mark>`s in `lines`: plain `<mark>` is red. */
function coloursIn(lines: readonly string[]): Set<HighlightColour> {
  const found = new Set<HighlightColour>();
  for (const line of lines)
    for (const [, cls] of line.matchAll(/<mark\b(?:\s+class=["']?(blue|green)["']?)?\s*>/g))
      found.add((cls as HighlightColour | undefined) ?? 'red');
  return found;
}

/** The legend for a dialog's `lines`, red first; empty when they have no highlights. */
export function highlightLegend(
  id: string,
  series: Series,
  lines: readonly string[],
  labels: Highlights = {},
): LegendEntry[] {
  const fail = (problem: string): never => {
    throw new Error(`Notes "${id}": ${problem} (highlights, docs/lesson-schema.md).`);
  };
  const used = coloursIn(lines);
  for (const colour of COLOURS) {
    if (labels[colour] && !used.has(colour)) fail(`highlights.${colour} labels a colour the dialog never uses`);
    if (colour !== 'red' && used.has(colour) && !labels[colour])
      fail(`the dialog has ${colour} highlights; say what they mark in highlights.${colour}, and red's in highlights.red`);
  }
  return COLOURS.filter((colour) => used.has(colour)).map((colour) => ({
    colour,
    label: labels[colour] ?? DEFAULT_RED[series],
  }));
}
