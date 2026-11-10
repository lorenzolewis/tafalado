import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkReadings, checkTranscriptFiles, matchTurns, parseVtt, type Cue } from './transcript';

const vtt = (...cues: string[]) => ['WEBVTT', '', 'NOTE test', '', ...cues.map((cue) => `${cue}\n`)].join('\n');

describe('parseVtt', () => {
  it('reads times in seconds, the speaker and the text', () => {
    expect(parseVtt(vtt('00:01:03.350 --> 01:00:08.770\n<v José Luis>Welcome, everyone.'))).toEqual([
      { start: 63.35, end: 3608.77, speaker: 'José Luis', html: 'Welcome, everyone.' },
    ]);
  });

  it('joins a cue of two lines with a space', () => {
    const [cue] = parseVtt(vtt('00:00:01.000 --> 00:00:02.000\n<v Orlando>Welcome to the\nBrazilian Portuguese podcast.'));
    expect(cue.html).toBe('Welcome to the Brazilian Portuguese podcast.');
  });

  it('skips NOTE blocks, wherever they are', () => {
    const cues = parseVtt(
      vtt('00:00:01.000 --> 00:00:02.000\n<v Valdo>One.', 'NOTE a remark\nover two lines', '00:00:03.000 --> 00:00:04.000\n<v Valdo>Two.'),
    );
    expect(cues.map((c) => c.html)).toEqual(['One.', 'Two.']);
  });

  it('turns language spans into <i lang> and escapes the rest', () => {
    const [cue] = parseVtt(vtt('00:00:01.000 --> 00:00:02.000\n<v Orlando>Say <lang pt-BR>tá</lang> &amp; <lang es>está</lang> &lt;3'));
    expect(cue.html).toBe('Say <i lang="pt-BR">tá</i> &amp; <i lang="es">está</i> &lt;3');
    expect(cue.lang).toBeUndefined();
  });

  it('marks a cue that is all one language, punctuation outside the span included', () => {
    const [pt, es] = parseVtt(
      vtt(
        '00:00:01.000 --> 00:00:02.000\n<v Michelle>“<lang pt-BR>Eu estou com dois ingressos</lang>”, <lang pt-BR>para o cinema</lang>…',
        '00:00:03.000 --> 00:00:04.000\n<v José Luis><lang es>Tengo dos entradas.</lang>',
      ),
    );
    expect(pt.lang).toBe('pt-BR');
    expect(es.lang).toBe('es');
  });

  it('merges a language span that carries on over the line break', () => {
    const [cue] = parseVtt(vtt('00:00:01.000 --> 00:00:02.000\n<v Michelle><lang pt-BR>Eu estou com</lang>\n<lang pt-BR>dois ingressos.</lang>'));
    expect(cue.html).toBe('<i lang="pt-BR">Eu estou com dois ingressos.</i>');
    expect(cue.lang).toBe('pt-BR');
  });

  it('leaves mixed cues without a language', () => {
    const cues = parseVtt(
      vtt(
        '00:00:01.000 --> 00:00:02.000\n<v Orlando><lang pt-BR>Tá</lang> means <lang es>está</lang>.',
        '00:00:03.000 --> 00:00:04.000\n<v Orlando><lang pt-BR>Tá</lang> <lang es>está</lang>',
        '00:00:05.000 --> 00:00:06.000\n<v Orlando>Plain English.',
      ),
    );
    expect(cues.map((c) => c.lang)).toEqual([undefined, undefined, undefined]);
  });

  it('gives a cue with no <v> an empty speaker', () => {
    expect(parseVtt(vtt('00:00:01.000 --> 00:00:02.000\nNobody.'))[0].speaker).toBe('');
  });
});

const cue = (start: number, html: string): Cue => ({ start, end: start + 1, speaker: 'Valdo', html });
const turn = (pt: string) => ({ speaker: 'Valdo' as const, pt, es: '–', en: '–' });

describe('matchTurns', () => {
  it('finds a turn said in one cue', () => {
    const cues = [cue(0, 'Hello.'), cue(1, '<i lang="pt-BR">Oi, tudo bem?</i>')];
    expect(matchTurns(cues, [turn('Oi, tudo bem?')])).toEqual([[{ start: 1, end: 2, firstCue: 1, lastCue: 1 }]]);
  });

  it('finds a turn split over two or three cues', () => {
    const cues = [cue(0, 'Listen.'), cue(1, 'Eu estou com dois'), cue(2, 'ingressos para o cinema'), cue(3, 'que tenho que usar.'), cue(4, 'Okay.')];
    expect(matchTurns(cues, [turn('Eu estou com dois ingressos'), turn('Eu estou com dois ingressos para o cinema que tenho que usar.')])).toEqual([
      [{ start: 1, end: 3, firstCue: 1, lastCue: 2 }],
      [{ start: 1, end: 4, firstCue: 1, lastCue: 3 }],
    ]);
  });

  it('finds every reading of a turn read several times', () => {
    const cues = [cue(0, 'Tudo bem.'), cue(10, 'Again, slowly.'), cue(20, 'Tudo bem.'), cue(30, 'Tudo... bem!')];
    expect(matchTurns(cues, [turn('Tudo bem.')]).map((r) => r.map((x) => x.start))).toEqual([[0, 20, 30]]);
  });

  it('ignores marks, case and punctuation in the notes and the transcript', () => {
    const cues = [cue(0, '<i lang="pt-BR">— Você tá, sim; é verdade?</i>')];
    expect(matchTurns(cues, [turn('<mark>Você</mark> <mark class="blue">tá</mark> sim, É VERDADE.')])[0]).toHaveLength(1);
  });

  it('does not match part of a word', () => {
    expect(matchTurns([cue(0, 'Obrigadão.')], [turn('Obrigada')])).toEqual([[]]);
  });

  it('gives a turn that is not there no readings', () => {
    expect(matchTurns([cue(0, 'Hello.')], [turn('Oi.'), turn('—')])).toEqual([[], []]);
  });
});

describe('checkTranscriptFiles', () => {
  it('passes transcripts that name a lesson and parse with a speaker on every cue', () => {
    expect(() => checkTranscriptFiles(['grammar-01'], { 'grammar-01': vtt('00:00:01.000 --> 00:00:02.000\n<v Valdo>Hi.') })).not.toThrow();
  });

  it('fails a transcript with no lesson', () => {
    expect(() => checkTranscriptFiles(['grammar-01'], { 'grammar-1': vtt('00:00:01.000 --> 00:00:02.000\n<v Valdo>Hi.') })).toThrow(
      /grammar-1\.vtt.*no lesson/,
    );
  });

  it('fails a transcript that does not follow the format', () => {
    expect(() => checkTranscriptFiles(['grammar-01'], { 'grammar-01': vtt('00:00:01.000 --> 00:00:02.000\nHi.') })).toThrow(
      /grammar-01\.vtt.*no <v Name> speaker/,
    );
    expect(() => checkTranscriptFiles(['grammar-01'], { 'grammar-01': 'WEBVTT\n' })).toThrow(/grammar-01\.vtt.*no cues/);
  });
});

describe('checkReadings', () => {
  it('passes when every turn has a reading', () => {
    expect(() => checkReadings('grammar-01', [turn('Oi.')], [[{ start: 0, end: 1, firstCue: 0, lastCue: 0 }]])).not.toThrow();
  });

  it('fails the build, naming the lesson and the turn, when a turn is not in the transcript', () => {
    expect(() => checkReadings('grammar-01', [turn('Oi.'), turn('Tchau, <mark>até</mark> logo.')], [[{ start: 0, end: 1, firstCue: 0, lastCue: 0 }], []])).toThrow(
      'Transcript "grammar-01": dialog turn 2 ("Tchau, até logo.") is not in public/transcripts/grammar-01.vtt',
    );
  });
});

describe('the committed transcripts', () => {
  const dir = 'public/transcripts';
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.vtt'))) {
    it(`${file} parses with a speaker on every cue`, () => {
      const cues = parseVtt(readFileSync(`${dir}/${file}`, 'utf8'));
      expect(cues.length).toBeGreaterThan(0);
      expect(cues.filter((c) => !c.speaker)).toEqual([]);
      expect(cues.filter((c) => /<(?!\/?i[ >])/.test(c.html))).toEqual([]);
    });
  }
});
