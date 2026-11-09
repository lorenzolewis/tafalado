import { describe, expect, it } from 'vitest';
import { checkNotes, checkNotesCoverage, resolveDialog } from './notes-check';
import type { Clip, NotesData, Speaker } from './notes-schema';

const turn = (speaker: Speaker, pt = 'Que b<mark>i</mark>fe.') => ({ speaker, pt, es: 'Qué biftec.', en: 'What a steak.' });
const notes = (id: string, data: Partial<NotesData> = {}, body = '## Cultural notes\n\nText.') => ({
  id,
  body,
  data: { source: 'https://example.org', dialog: [turn('Valdo')], ...data } as NotesData,
});

describe('checkNotes', () => {
  it('checks the markup of highlight labels like dialog strings', () => {
    expect(() =>
      checkNotes(notes('pronunciation-03', { highlights: { red: 'Closed e <b>/ê/</b>' } })),
    ).toThrow(/pronunciation-03.*highlights\.red.*<b>/);
  });

  it('accepts balanced highlights and the notes languages', () => {
    expect(() =>
      checkNotes(
        notes(
          'pronunciation-01',
          {},
          'Like <i lang="es">bebe</i>, <i lang="pt-BR">b<mark>i</mark>fe</i>, <span lang="pt-BR-fonipa">[i]</span>, <span lang="en-fonipa">[ɪ]</span>, <span lang="es-fonipa">[e]</span>.',
        ),
      ),
    ).not.toThrow();
  });

  it('fails on an unclosed or stray <mark> in the body, naming the file', () => {
    expect(() => checkNotes(notes('grammar-02', {}, 'n<mark>aquele'))).toThrow(/grammar-02.*<mark>/);
    expect(() => checkNotes(notes('grammar-02', {}, 'naquele</mark>'))).toThrow(/grammar-02.*<mark>/);
    expect(() => checkNotes(notes('grammar-02', {}, '<mark>a<mark>b</mark></mark>'))).toThrow(/grammar-02.*<mark>/);
  });

  it('allows <mark class="blue"> and <mark class="green"> but no other <mark> attributes', () => {
    expect(() => checkNotes(notes('pronunciation-10', {}, 'ga<mark>t</mark>o, <mark class="blue">d</mark>ia, <mark class="green">x</mark>'))).not.toThrow();
    expect(() => checkNotes(notes('pronunciation-10', {}, '<mark class="red">t</mark>'))).toThrow(/pronunciation-10.*<mark class="red">/);
    expect(() => checkNotes(notes('pronunciation-10', {}, '<mark style="x">t</mark>'))).toThrow(/pronunciation-10.*<mark/);
    expect(() => checkNotes(notes('pronunciation-10', {}, '<mark class="blue">t<mark>u</mark></mark>'))).toThrow(/pronunciation-10.*<mark>/);
  });

  it('accepts single-quoted classes, as double-quoted YAML strings write them', () => {
    expect(() => checkNotes(notes('grammar-11', { dialog: [turn('Valdo', "<mark class='blue'>Eu</mark> acho.")] }))).not.toThrow();
    expect(() => checkNotes(notes('grammar-11', {}, "<mark class='green'>se</mark>"))).not.toThrow();
    expect(() => checkNotes(notes('grammar-11', {}, "<mark class='red'>t</mark>"))).toThrow(/grammar-11.*<mark class='red'>/);
    expect(() => checkNotes(notes('grammar-11', {}, `<mark class='blue">t</mark>`))).toThrow(/grammar-11.*<mark/);
  });

  it('lets only supplementary lessons have neither a dialog nor clips', () => {
    expect(() => checkNotes(notes('supplementary-01', { dialog: undefined }))).not.toThrow();
    expect(() => checkNotes(notes('grammar-03', { dialog: undefined }))).toThrow(/grammar-03.*dialog or clips/);
  });

  it('fails on an unbalanced <mark> in a dialog line, naming the turn', () => {
    expect(() => checkNotes(notes('pronunciation-01', { dialog: [turn('Valdo'), turn('Michelle', 'b<mark>ife')] }))).toThrow(
      /pronunciation-01.*turn 2.*<mark>/,
    );
  });

  it('fails on a lang outside the notes rules', () => {
    expect(() => checkNotes(notes('pronunciation-01', {}, '<i lang="pt">bife</i>'))).toThrow(
      /pronunciation-01.*lang="pt"/,
    );
    expect(() => checkNotes(notes('pronunciation-01', {}, '<span lang="fonipa">[i]</span>'))).toThrow(/lang="fonipa"/);
  });

  it('allows English and Italian on words, for glosses and quoted turns', () => {
    expect(() =>
      checkNotes(notes('grammar-15', {}, 'sobrenome <span lang="en">(last name)</span>, <i lang="it">figlia</i>')),
    ).not.toThrow();
    expect(() => checkNotes(notes('grammar-15', {}, '<i lang="fr">fille</i>'))).toThrow(/grammar-15.*lang="fr"/);
  });

  it('allows only <mark>, <i>, <em> and <span> markup in dialog and clip strings', () => {
    expect(() =>
      checkNotes(notes('pronunciation-01', { dialog: [turn('Valdo', 'Que <b>bife</b>.')] })),
    ).toThrow(/pronunciation-01.*turn 1.*<b>/);
  });

  it('checks clip lines and observations too', () => {
    const clip: Clip = {
      heading: 'Clip #1',
      speakers: ['Valdo', 'Vivian'],
      lines: ['Ah, é me<mark>s</mark>mo.'],
      observations: 'The <mark>en</mark>TAO',
    };
    expect(() => checkNotes(notes('pronunciation-24', { dialog: undefined, clips: [clip] }))).not.toThrow();
    expect(() =>
      checkNotes(notes('pronunciation-24', { dialog: undefined, clips: [{ ...clip, observations: '<mark>en' }] })),
    ).toThrow(/pronunciation-24.*clip 1.*<mark>/);
  });
});

describe('checkNotesCoverage', () => {
  it('fails on notes with no lesson', () => {
    expect(() => checkNotesCoverage(['pronunciation-01'], ['pronunciation-01', 'pronunciation-99'])).toThrow(
      /pronunciation-99/,
    );
  });

  it('fails on a lesson with no notes', () => {
    expect(() => checkNotesCoverage(['pronunciation-01', 'grammar-01'], ['pronunciation-01'])).toThrow(/grammar-01/);
  });

  it('accepts notes for exactly the lessons', () => {
    expect(() => checkNotesCoverage(['pronunciation-01', 'grammar-01'], ['grammar-01', 'pronunciation-01'])).not.toThrow();
  });
});

describe('resolveDialog', () => {
  const original = notes('pronunciation-12', {
    dialog: [turn('Valdo', 'Então tá.'), turn('Michelle', 'É mesmo.')],
  });
  const byId = new Map([[original.id, original]]);

  it("returns a lesson's own dialog", () => {
    expect(resolveDialog(original, byId)).toEqual(original.data.dialog);
  });

  it('takes a shared dialog from the lesson it names, recast with its own speakers', () => {
    const alternate = notes('pronunciation-13', { dialog: { from: 'pronunciation-12', speakers: ['Valdo', 'Vivian'] } });
    expect(resolveDialog(alternate, byId)).toEqual([turn('Valdo', 'Então tá.'), turn('Vivian', 'É mesmo.')]);
  });

  it('keeps the original speakers when none are given', () => {
    const alternate = notes('pronunciation-13', { dialog: { from: 'pronunciation-12' } });
    expect(resolveDialog(alternate, byId)).toEqual(original.data.dialog);
  });

  it('fails when the speakers do not match the turns one for one', () => {
    const alternate = notes('pronunciation-13', { dialog: { from: 'pronunciation-12', speakers: ['Vivian'] } });
    expect(() => resolveDialog(alternate, byId)).toThrow(/pronunciation-13.*2 turns.*1 speaker/);
  });

  it('fails when the named lesson has no dialog of its own', () => {
    const chained = notes('pronunciation-15', { dialog: { from: 'pronunciation-13' } });
    const alternate = notes('pronunciation-13', { dialog: { from: 'pronunciation-12' } });
    expect(() => resolveDialog(chained, new Map([...byId, [alternate.id, alternate]]))).toThrow(
      /pronunciation-15.*pronunciation-13/,
    );
    expect(() => resolveDialog(notes('x', { dialog: { from: 'nope' } }), byId)).toThrow(/x.*nope/);
  });

  it('is undefined for clips', () => {
    expect(resolveDialog(notes('pronunciation-24', { dialog: undefined, clips: [] }), byId)).toBeUndefined();
  });
});
