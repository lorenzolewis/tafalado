// The language of a notes table's cells, from its column headers (#88, docs/lesson-schema.md). A
// Sätteri hast plugin (astro.config.ts): GFM tables can't carry attributes, so each header names its
// column's language and every cell below it gets that `lang`. A header it doesn't know fails the
// build, so no table ships untagged.
import type { Element, ElementContent } from 'hast';
import { defineHastPlugin } from 'satteri';

/**
 * Column header → the `lang` of the cells below it. `Notes` and `Examples` columns (mixed content,
 * marked inline with `<i lang>` / `<span lang>`) map to null and stay untagged. A symbol column is
 * about Portuguese sounds unless its header says otherwise.
 */
export const COLUMN_LANG: Readonly<Record<string, string | null>> = {
  portuguese: 'pt-BR',
  spanish: 'es',
  english: 'en',
  symbol: 'pt-BR-fonipa',
  'symbol (portuguese)': 'pt-BR-fonipa',
  'symbol (spanish)': 'es-fonipa',
  'symbol (english)': 'en-fonipa',
  notes: null,
  examples: null,
};

const isElement = (node: ElementContent, tag?: string): node is Element =>
  node.type === 'element' && (!tag || node.tagName === tag);

function text(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  return isElement(node) ? node.children.map(text).join('') : '';
}

const rows = (table: Element): Element[] =>
  table.children
    .filter((child) => isElement(child, 'thead') || isElement(child, 'tbody'))
    .flatMap((section) => (section as Element).children.filter((row) => isElement(row, 'tr'))) as Element[];

const cells = (row: Element): Element[] => row.children.filter((c) => isElement(c, 'td') || isElement(c, 'th')) as Element[];

/** The table with `lang` set on each body cell, or an error naming the first header it can't map. */
export function tagTable(table: Element, file: string): Element {
  const header = rows(table)[0];
  if (!header) return table;
  const langs = cells(header).map((th) => {
    const name = text(th).trim().replace(/\s+/g, ' ');
    const lang = COLUMN_LANG[name.toLowerCase()];
    if (lang === undefined)
      throw new Error(
        `${file}: a table has the column header "${name}". Use Portuguese, Spanish, English, Symbol, ` +
          `Symbol (Portuguese|Spanish|English), Notes or Examples (docs/lesson-schema.md).`,
      );
    return lang;
  });

  const tagRow = (row: Element): Element => {
    let column = 0;
    return {
      ...row,
      children: row.children.map((cell) => {
        if (!isElement(cell, 'td')) return cell;
        const lang = langs[column++];
        return lang ? { ...cell, properties: { ...cell.properties, lang } } : cell;
      }),
    };
  };
  const tagSection = (section: ElementContent): ElementContent =>
    isElement(section, 'tbody')
      ? { ...section, children: section.children.map((row) => (isElement(row, 'tr') ? tagRow(row) : row)) }
      : section;
  return { ...table, children: table.children.map(tagSection) };
}

export const tableLang = defineHastPlugin({
  name: 'tafalado-table-lang',
  element: {
    filter: ['table'],
    visit(table, ctx) {
      return tagTable(table as Element, ctx.fileURL?.pathname ?? 'A Markdown file');
    },
  },
});
