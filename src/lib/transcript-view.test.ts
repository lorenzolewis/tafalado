import { describe, expect, it } from 'vitest';
import type { Cue } from './transcript';
import { cueAt, cuesHtml, readingAt } from './transcript-view';

describe('cueAt', () => {
  const starts = [0, 4.5, 9, 20];
  it('is the last cue started by then', () => {
    expect(cueAt(starts, 0)).toBe(0);
    expect(cueAt(starts, 4.4)).toBe(0);
    expect(cueAt(starts, 4.5)).toBe(1);
    expect(cueAt(starts, 19.9)).toBe(2);
    expect(cueAt(starts, 600)).toBe(3);
  });
  it('is none before the first cue, or with no cues', () => {
    expect(cueAt([3, 5], 1)).toBe(-1);
    expect(cueAt([], 1)).toBe(-1);
  });
});

describe('readingAt', () => {
  const readings = [
    { start: 10, end: 14, firstCue: 2, lastCue: 3 },
    { start: 60, end: 66, firstCue: 9, lastCue: 11 },
  ];
  it('is which reading is playing, if any', () => {
    expect(readingAt(readings, 9.9)).toBe(-1);
    expect(readingAt(readings, 10)).toBe(0);
    expect(readingAt(readings, 13.9)).toBe(0);
    expect(readingAt(readings, 14)).toBe(-1);
    expect(readingAt(readings, 65)).toBe(1);
  });
});

describe('cuesHtml', () => {
  const cues: Cue[] = [
    { start: 3.35, end: 8, speaker: 'Orlando', html: 'Welcome to <i lang="pt-BR">Tá Falado</i>.' },
    { start: 8, end: 9, speaker: 'Orlando', html: 'Today, a dialog.' },
    { start: 65, end: 70, speaker: 'Michelle', html: '<i lang="pt-BR">Oi!</i>', lang: 'pt-BR' },
    { start: 71, end: 72, speaker: 'José <Luis>', html: '<i lang="es">¡Hola!</i>', lang: 'es' },
  ];
  const html = cuesHtml(cues);
  const items = html.match(/<li[\s\S]*?<\/li>/g)!;

  it('makes every line a button that seeks to its start', () => {
    expect(items).toHaveLength(4);
    expect(items[0]).toContain('<button type="button" class="line" data-seek-to="3.35">');
    expect(items[0]).toContain('<span class="time">0:03</span>');
    expect(items[2]).toContain('<span class="time">1:05</span>');
  });

  it('shows the speaker when it changes, and keeps it for screen readers on repeats', () => {
    expect(items[0]).toContain('<span class="who">Orlando<span class="visually-hidden">:</span></span>');
    expect(items[1]).toContain('data-repeat');
    expect(items[1]).toContain('<span class="who visually-hidden">Orlando');
    expect(items[2]).not.toContain('data-repeat');
  });

  it('chips a line all in Portuguese or Spanish, hidden from screen readers', () => {
    expect(items[0]).not.toContain('lang-chip');
    expect(items[2]).toContain('<span class="lang-chip" data-lang="pt-BR" aria-hidden="true">PT</span>');
    expect(items[3]).toContain('<span class="lang-chip" data-lang="es" aria-hidden="true">ES</span>');
  });

  it('keeps the text as HTML and escapes the speaker', () => {
    expect(items[0]).toContain('<span class="text">Welcome to <i lang="pt-BR">Tá Falado</i>.</span>');
    expect(items[3]).toContain('José &lt;Luis&gt;');
  });
});
