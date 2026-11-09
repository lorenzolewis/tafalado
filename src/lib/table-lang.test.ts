import { markdownToHtml } from 'satteri';
import { describe, expect, it } from 'vitest';
import { tableLang } from './table-lang';

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

  it('matches headers regardless of case and surrounding space', async () => {
    const html = await render(['|  portuguese  |', '| --- |', '| no |'].join('\n'));
    expect(html).toContain('<td lang="pt-BR">no</td>');
  });

  it('fails on a header it does not recognise, naming the file and the header', async () => {
    await expect(render(['| Portuguese | Contraction |', '| --- | --- |', '| no | em + o |'].join('\n'))).rejects.toThrow(
      /grammar-02\.md.*"Contraction"/,
    );
  });

  it('leaves Markdown without tables alone', async () => {
    expect(await render('Plain <i lang="pt-BR">bife</i>.')).toBe('<p>Plain <i lang="pt-BR">bife</i>.</p>\n');
  });
});
