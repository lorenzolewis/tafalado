// The language of a notes table's cells, from its column headers (#88, docs/lesson-schema.md). A
// Sätteri hast plugin (astro.config.ts): GFM tables can't carry attributes, so each header names its
// column's language and every cell below it gets that `lang`. A header it doesn't know fails the
// build, so no table ships untagged.
import type { Element, ElementContent } from 'hast';
import { defineHastPlugin } from 'satteri';

/**
 * Column header → the `lang` of the cells below it. `Notes`, `Examples` and `Form` columns (mixed content,
 * marked inline with `<i lang>` / `<span lang>`) map to null and stay untagged. A symbol column is
 * about Portuguese sounds unless its header says otherwise. Headers match regardless of case.
 */
export const COLUMN_LANG: Readonly<Record<string, string | null>> = {
  Portuguese: 'pt-BR',
  'Preposition + article': 'pt-BR',
  Spanish: 'es',
  English: 'en',
  Symbol: 'pt-BR-fonipa',
  'Symbol (Portuguese)': 'pt-BR-fonipa',
  'Symbol (Spanish)': 'es-fonipa',
  'Symbol (English)': 'en-fonipa',
  Notes: null,
  Examples: null,
  Form: null,
};

const LANG_BY_HEADER = new Map(Object.entries(COLUMN_LANG).map(([name, lang]) => [name.toLowerCase(), lang]));
const HEADERS = Object.keys(COLUMN_LANG);
const HEADER_LIST = `${HEADERS.slice(0, -1).join(', ')} or ${HEADERS.at(-1)}`;

const isElement = (node: ElementContent, tag?: string): node is Element =>
  node.type === 'element' && (!tag || node.tagName === tag);

const isCell = (node: ElementContent): node is Element => isElement(node, 'td') || isElement(node, 'th');

function text(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  return isElement(node) ? node.children.map(text).join('') : '';
}

/** How many columns a cell covers. */
function span(cell: Element): number {
  const n = Number(cell.properties.colSpan ?? 1);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

const rows = (table: Element): Element[] =>
  table.children
    .filter((child) => isElement(child, 'thead') || isElement(child, 'tbody'))
    .flatMap((section) => (section as Element).children.filter((row) => isElement(row, 'tr'))) as Element[];

/** The table with `lang` set on each body cell, or an error naming the first header it can't map. */
export function tagTable(table: Element, file: string): Element {
  const header = rows(table)[0];
  if (!header) return table;
  const langs = header.children.filter(isCell).flatMap((th) => {
    const name = text(th).trim().replace(/\s+/g, ' ');
    const lang = LANG_BY_HEADER.get(name.toLowerCase());
    if (lang === undefined)
      throw new Error(`${file}: a table has the column header "${name}". Use ${HEADER_LIST} (docs/lesson-schema.md).`);
    return Array<string | null>(span(th)).fill(lang);
  });

  // Every cell, <td> or <th>, takes up its colspan's worth of columns. A <td> gets the language of
  // the columns it covers when they share one.
  const tagRow = (row: Element): Element => {
    let column = 0;
    return {
      ...row,
      children: row.children.map((cell) => {
        if (!isCell(cell)) return cell;
        const covered = new Set(langs.slice(column, (column += span(cell))));
        const [lang] = covered;
        return isElement(cell, 'td') && covered.size === 1 && lang
          ? { ...cell, properties: { ...cell.properties, lang } }
          : cell;
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
