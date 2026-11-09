import { markdownToHtml } from 'satteri';
import { describe, expect, it } from 'vitest';
import type { Element, ElementContent } from 'hast';
import { tableLang, tagTable } from './table-lang';

const render = async (md: string) =>
  (await markdownToHtml(md, { hastPlugins: [tableLang], fileURL: new URL('file:///site/src/content/notes/grammar-02.md') }))
    .html;

describe('tableLang', () => {
  it('sets lang on every cell under a Portuguese, Spanish, English or Symbol header', async () => {
    const html = await render(
      ['| Portuguese | Spanish | English | Symbol |', '| --- | --- | --- | --- |', '| no | en el | in the | [u] |'].join('\n'),
    );
    expect(html).toContain('<td lang="pt-BR">no</td>');
    expect(html).toContain('<td lang="es">en el</td>');
    expect(html).toContain('<td lang="en">in the</td>');
    expect(html).toContain('<td lang="pt-BR-fonipa">[u]</td>');
    // The headers themselves are English, like the page.
    expect(html).toContain('<th>Portuguese</th>');
  });

  it('keeps highlights and inline markup in a tagged cell', async () => {
    const html = await render(['| Portuguese |', '| --- |', '| b<mark>i</mark>f<mark>e</mark> |'].join('\n'));
    expect(html).toContain('<td lang="pt-BR">b<mark>i</mark>f<mark>e</mark></td>');
  });

  it('says which sounds a symbol column is about: "Symbol (English)" and "Symbol (Spanish)"', async () => {
    const html = await render(
      ['| Symbol (English) | Symbol (Spanish) | Symbol (Portuguese) |', '| --- | --- | --- |', '| [ɪ] | [e] | [ɛ] |'].join(
        '\n',
      ),
    );
    expect(html).toContain('<td lang="en-fonipa">[ɪ]</td>');
    expect(html).toContain('<td lang="es-fonipa">[e]</td>');
    expect(html).toContain('<td lang="pt-BR-fonipa">[ɛ]</td>');
  });

  it('leaves Notes and Examples columns untagged, for mixed content marked inline', async () => {
    const html = await render(
      ['| Portuguese | Notes | Examples |', '| --- | --- | --- |', '| no | em + o | <i lang="pt-BR">no carro</i> |'].join('\n'),
    );
    expect(html).toContain('<td>em + o</td>');
    expect(html).toContain('<td><i lang="pt-BR">no carro</i></td>');
  });

  it('tags a "Preposition + article" column Portuguese and leaves a "Form" column untagged', async () => {
    const html = await render(
      ['| Preposition + article | Form | Spanish |', '| --- | --- | --- |', '| em + o | Masc & Sing | en el |'].join('\n'),
    );
    expect(html).toContain('<td lang="pt-BR">em + o</td>');
    expect(html).toMatch(/<td>Masc &(amp;|#x26;) Sing<\/td>/);
    expect(html).toContain('<td lang="es">en el</td>');
  });

  it('matches headers regardless of case and surrounding space', async () => {
    const html = await render(['|  portuguese  |', '| --- |', '| no |'].join('\n'));
    expect(html).toContain('<td lang="pt-BR">no</td>');
  });

  it('fails on a header it does not recognise, naming the file and the header', async () => {
    await expect(render(['| Portuguese | Contraction |', '| --- | --- |', '| no | em + o |'].join('\n'))).rejects.toThrow(
      /grammar-02\.md.*"Contraction"/,
    );
  });

  it('lists every header it accepts when it fails', async () => {
    await expect(render(['| Contraction |', '| --- |', '| no |'].join('\n'))).rejects.toThrow(
      'Use Portuguese, Preposition + article, Spanish, English, Symbol, Symbol (Portuguese), Symbol (Spanish), ' +
        'Symbol (English), Notes, Examples or Form',
    );
  });

  it('leaves Markdown without tables alone', async () => {
    expect(await render('Plain <i lang="pt-BR">bife</i>.')).toBe('<p>Plain <i lang="pt-BR">bife</i>.</p>\n');
  });
});

const el = (tagName: string, children: ElementContent[] = [], properties: Element['properties'] = {}): Element => ({
  type: 'element',
  tagName,
  properties,
  children,
});
const cell = (tag: 'td' | 'th', value: string, properties: Element['properties'] = {}) =>
  el(tag, [{ type: 'text', value }], properties);
const table = (head: Element[], ...body: Element[][]) =>
  el('table', [el('thead', [el('tr', head)]), el('tbody', body.map((row) => el('tr', row)))]);
const bodyLangs = (t: Element) =>
  ((t.children[1] as Element).children as Element[]).map((row) =>
    (row.children as Element[]).map((c) => `${c.tagName}:${c.properties.lang ?? '-'}`),
  );

describe('tagTable', () => {
  it('counts a <th> in a body row as a column', () => {
    const tagged = tagTable(
      table([cell('th', 'Notes'), cell('th', 'Portuguese'), cell('th', 'Spanish')], [cell('th', 'Masc'), cell('td', 'no'), cell('td', 'en el')]),
      'grammar-02.md',
    );
    expect(bodyLangs(tagged)).toEqual([['th:-', 'td:pt-BR', 'td:es']]);
  });

  it('honours colspan in the header and the body', () => {
    const tagged = tagTable(
      table(
        [cell('th', 'Portuguese', { colSpan: 2 }), cell('th', 'Spanish'), cell('th', 'English')],
        [cell('td', 'no'), cell('td', 'na'), cell('td', 'en el'), cell('td', 'in the')],
        [cell('td', 'em + o', { colSpan: 2 }), cell('td', 'en el'), cell('td', 'in the')],
        [cell('td', 'no'), cell('td', 'na · en el', { colSpan: 2 }), cell('td', 'in the')],
      ),
      'grammar-02.md',
    );
    expect(bodyLangs(tagged)).toEqual([
      ['td:pt-BR', 'td:pt-BR', 'td:es', 'td:en'],
      ['td:pt-BR', 'td:es', 'td:en'],
      // Spanning a Portuguese and a Spanish column: no single language, so untagged.
      ['td:pt-BR', 'td:-', 'td:en'],
    ]);
  });
});
