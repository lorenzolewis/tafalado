import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkTranscript, visibleText } from './transcript-check';

const vtt = (...cues: string[]) => ['WEBVTT', '', 'NOTE test', '', ...cues.map((cue) => `${cue}\n`)].join('\n');

describe('checkTranscript', () => {
  it('accepts speaker-labelled cues with language spans', () => {
    const check = checkTranscript(
      vtt(
        '00:00:03.350 --> 00:00:08.770\n<v Orlando>Welcome to <lang pt-BR>Tá Falado</lang>, the Brazilian Portuguese\npronunciation for speakers of Spanish.',
        '00:00:09.000 --> 00:00:10.000\n<v José Luis><lang es>Tengo dos entradas.</lang>',
      ),
    );
    expect(check.errors).toEqual([]);
    expect(check.cues).toBe(2);
    expect([...check.speakers]).toEqual(['Orlando', 'José Luis']);
  });

  it('needs the WEBVTT header and at least one cue', () => {
    expect(checkTranscript('Hello').errors).toEqual(['does not start with WEBVTT', 'no cues']);
  });

  it('flags missing speakers, long lines, a third line and bad timings', () => {
    const errors = checkTranscript(
      vtt(
        '00:00:05.000 --> 00:00:04.000\nNo speaker here.',
        `00:00:06.000 --> 00:00:07.000\n<v Valdo>${'a'.repeat(66)}`,
        '00:00:01.000 --> 00:00:02.000\n<v Valdo>One\ntwo\nthree',
      ),
    ).errors;
    expect(errors).toEqual([
      '00:00:05.000: ends before it starts',
      '00:00:05.000: no <v Name> speaker',
      '00:00:06.000: line of 66 characters, at most 65',
      '00:00:01.000: starts before the cue above',
      '00:00:01.000: 3 lines, at most 2',
    ]);
  });

  it('only allows balanced pt-BR and es spans, closed on each line', () => {
    const errors = checkTranscript(
      vtt(
        '00:00:01.000 --> 00:00:02.000\n<v Valdo><lang pt>Oi</lang>',
        '00:00:03.000 --> 00:00:04.000\n<v Valdo><lang pt-BR>Oi,\ntudo bem?</lang>',
        '00:00:05.000 --> 00:00:06.000\n<v Valdo><b>Oi</b> & tchau',
      ),
    ).errors;
    expect(errors).toEqual([
      '00:00:01.000: <lang pt>, only pt-BR or es',
      '00:00:03.000: <lang> left open at the end of a line',
      '00:00:03.000: </lang> without <lang>',
      '00:00:05.000: unescaped &',
      '00:00:05.000: unexpected tag <b>',
      '00:00:05.000: unexpected tag </b>',
    ]);
  });

  it('counts only the characters a player shows', () => {
    expect(visibleText('<v Orlando>S &amp; Z in <lang pt-BR>casa</lang>')).toBe('S & Z in casa');
  });
});

describe('the committed transcripts', () => {
  const dir = new URL('../../public/transcripts/', import.meta.url);
  const files = readdirSync(dir).filter((file) => file.endsWith('.vtt'));

  it.each(files)('%s follows the format', (file) => {
    expect(checkTranscript(readFileSync(new URL(file, dir), 'utf8')).errors).toEqual([]);
  });
});
