import { describe, expect, it } from 'vitest';
import { checkDescription, dialogHtml, notesLinkText } from './feed-notes';

const turns = [
  {
    speaker: 'Valdo',
    pt: 'Qu<mark>e</mark> b<mark>i</mark>f<mark>e</mark> gostoso.',
    es: 'Qué biftec sabroso.',
    en: 'What a tasty steak.',
  },
  { speaker: 'Michelle', pt: 'É <mark>i</mark>sso a<mark>í</mark>.', es: 'Eso es.', en: 'You go for <em>it</em>.' },
];

describe('dialogHtml', () => {
  it('gives one paragraph per turn: speaker, then Portuguese, Spanish and English with their lang, highlights dropped', () => {
    expect(dialogHtml(turns)).toBe(
      '<p><b>Valdo:</b> <span lang="pt-BR">Que bife gostoso.</span><br><i lang="es">Qué biftec sabroso.</i><br><span lang="en">What a tasty steak.</span></p>\n' +
        '<p><b>Michelle:</b> <span lang="pt-BR">É isso aí.</span><br><i lang="es">Eso es.</i><br><span lang="en">You go for <em>it</em>.</span></p>',
    );
  });

  it('drops the blue and green highlights too', () => {
    const turn = { speaker: 'Vivian', pt: 'ga<mark>t</mark>o, <mark class="blue">d</mark>ia', es: 'gato, día', en: 'cat, day' };
    expect(dialogHtml([turn])).toContain('<span lang="pt-BR">gato, dia</span>');
  });

  it('escapes the speaker, a plain name rather than HTML', () => {
    const turn = { speaker: 'Tom & <Jerry>', pt: 'Oi.', es: 'Hola.', en: 'Hi.' };
    expect(dialogHtml([turn])).toContain('<p><b>Tom &amp; &lt;Jerry&gt;:</b> ');
  });
});

describe('notesLinkText', () => {
  it('points readers to the notes the lesson page has', () => {
    expect(notesLinkText('pronunciation')).toBe('Cultural and pronunciation notes on the lesson page');
    expect(notesLinkText('grammar')).toBe('Cultural and grammar notes on the lesson page');
    expect(notesLinkText('supplementary')).toBe('Notes on the lesson page');
  });
});

describe('checkDescription', () => {
  const valdo =
    '<p><b>Valdo:</b> <span lang="pt-BR">Que bife gostoso.</span><br><i lang="es">Qué biftec sabroso.</i><br><span lang="en">What a tasty steak.</span></p>';
  const michelle =
    '<p><b>Michelle:</b> <span lang="pt-BR">É isso aí.</span><br><i lang="es">Eso es.</i><br><span lang="en">You go for <em>it</em>.</span></p>';

  it('passes notes that hold every turn of the dialog', () => {
    expect(checkDescription(`<p>Intro.</p>\n${valdo}\n${michelle}`, turns)).toEqual({ errors: [], warnings: [] });
  });

  it('names each turn, and the language, missing from the notes', () => {
    const noSpanish = michelle.replace('<i lang="es">Eso es.</i>', '<i>Eso es.</i>');
    expect(checkDescription(`<p>Intro.</p>\n${noSpanish}`, turns).errors).toEqual([
      'dialog turn 1 (Valdo) is missing in pt-BR, es, en',
      'dialog turn 2 (Michelle) is missing in es',
    ]);
  });

  it('allows notes with no dialog when the lesson has none (Pronunciation 24, the supplementary lessons)', () => {
    expect(checkDescription('<p>Intro.</p>', undefined)).toEqual({ errors: [], warnings: [] });
  });

  it('fails on a dialog in the notes of a lesson that has none', () => {
    expect(checkDescription(`<p>Intro.</p>\n${valdo}`, undefined).errors).toEqual([
      "has a dialog, but the lesson's notes have none",
    ]);
  });

  it("fails on a highlight left in, which podcast apps don't show", () => {
    expect(checkDescription('<p>Qu<mark>e</mark></p>', undefined).errors).toEqual([
      "has <mark>, which podcast apps don't show",
    ]);
  });

  it('warns past 4,000 characters, where apps are reported to cut notes off', () => {
    expect(checkDescription(`<p>${'a'.repeat(3993)}</p>`, undefined).warnings).toEqual([]);
    expect(checkDescription(`<p>${'a'.repeat(3994)}</p>`, undefined).warnings).toEqual([
      'is 4,001 characters, over the 4,000 at which some apps cut notes off',
    ]);
  });
});
