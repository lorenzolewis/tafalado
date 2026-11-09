// The dialog in the podcast episode notes (#90): what src/pages/feed.xml.ts writes into each item's
// <description>, and what scripts/validate-feed.ts checks there. Pure and free of astro:content, so
// both the build and the plain-Node validator import it.

import type { Turn } from './notes-check.ts';
import type { Series } from './series.ts';

/**
 * One paragraph per turn: the speaker, then Portuguese, Spanish and English, each with its lang.
 * Podcast apps show only basic HTML, so the highlights (`<mark>`) go and their text stays.
 */
export function dialogHtml(turns: readonly Turn[]): string {
  return turns
    .map(
      (turn) =>
        `<p><b>${turn.speaker}:</b> <span lang="pt-BR">${stripMark(turn.pt)}</span><br>` +
        `<i lang="es">${stripMark(turn.es)}</i><br><span lang="en">${stripMark(turn.en)}</span></p>`,
    )
    .join('\n');
}

/** The link from an episode's notes to its lesson page, naming the notes found there. */
export function notesLinkText(series: Series): string {
  if (series === 'supplementary') return 'Notes on the lesson page';
  return `Cultural and ${series} notes on the lesson page`;
}

/** Past this, podcast apps are widely reported to cut episode notes off. */
export const DESCRIPTION_LIMIT = 4000;

/**
 * Problems with an item's <description>: `errors` when it lacks a turn of `dialog` (the lesson's,
 * undefined when it has none) in any language, or keeps a `<mark>`; `warnings` past the limit.
 */
export function checkDescription(
  description: string,
  dialog: readonly Turn[] | undefined,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  dialog?.forEach((turn, i) => {
    const expected = {
      'pt-BR': `<span lang="pt-BR">${stripMark(turn.pt)}</span>`,
      es: `<i lang="es">${stripMark(turn.es)}</i>`,
      en: `<span lang="en">${stripMark(turn.en)}</span>`,
    };
    const missing = Object.entries(expected)
      .filter(([, html]) => !description.includes(html))
      .map(([lang]) => lang);
    if (missing.length) errors.push(`dialog turn ${i + 1} (${turn.speaker}) is missing in ${missing.join(', ')}`);
  });
  if (/<mark\b/.test(description)) errors.push("has <mark>, which podcast apps don't show");
  if (description.length > DESCRIPTION_LIMIT)
    warnings.push(
      `is ${description.length.toLocaleString('en-US')} characters, over the ${DESCRIPTION_LIMIT.toLocaleString('en-US')} at which some apps cut notes off`,
    );
  return { errors, warnings };
}

function stripMark(html: string): string {
  return html.replace(/<\/?mark\s*>/g, '');
}
