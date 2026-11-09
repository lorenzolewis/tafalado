// Checks a WebVTT episode transcript against the format in docs/transcripts.md, for
// scripts/validate-feed.ts and the tests: the WEBVTT header, cue timings in order, a <v Name>
// speaker on every cue, at most two lines of at most 65 visible characters (the Podcast
// Namespace recommendation), and only <v> and balanced <lang pt-BR> / <lang es> tags.

export const MAX_LINE = 65;
export const MAX_LINES = 2;
const LANGS = new Set(['pt-BR', 'es']);
const TIMING = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})$/;

const seconds = (h: string, m: string, s: string, ms: string) => +h * 3600 + +m * 60 + +s + +ms / 1000;

/** Text a player shows: tags dropped, the three escapes undone. */
export function visibleText(line: string): string {
  return line
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export interface TranscriptCheck {
  errors: string[];
  cues: number;
  speakers: Set<string>;
}

export function checkTranscript(vtt: string): TranscriptCheck {
  const errors: string[] = [];
  const speakers = new Set<string>();
  const fail = (message: string) => errors.push(message);
  if (!vtt.startsWith('WEBVTT')) fail('does not start with WEBVTT');
  const blocks = vtt.replace(/\r\n/g, '\n').split(/\n{2,}/).slice(1);
  let cues = 0;
  let last = 0;
  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line !== '');
    if (lines.length === 0 || lines[0].startsWith('NOTE')) continue;
    cues++;
    const timing = lines[0].match(TIMING);
    if (!timing) {
      fail(`cue ${cues}: bad timing line "${lines[0]}"`);
      continue;
    }
    const at = lines[0].slice(0, 12);
    const start = seconds(timing[1], timing[2], timing[3], timing[4]);
    const end = seconds(timing[5], timing[6], timing[7], timing[8]);
    if (end <= start) fail(`${at}: ends before it starts`);
    if (start < last) fail(`${at}: starts before the cue above`);
    last = start;
    const text = lines.slice(1);
    if (text.length === 0) fail(`${at}: no text`);
    if (text.length > MAX_LINES) fail(`${at}: ${text.length} lines, at most ${MAX_LINES}`);
    const voice = text[0]?.match(/^<v ([^>]+)>/);
    if (voice) speakers.add(voice[1]);
    else fail(`${at}: no <v Name> speaker`);
    for (const line of text) {
      const length = [...visibleText(line)].length;
      if (length > MAX_LINE) fail(`${at}: line of ${length} characters, at most ${MAX_LINE}`);
      if (/&(?!amp;|lt;|gt;)/.test(line)) fail(`${at}: unescaped &`);
      let open = 0;
      for (const [tag] of line.matchAll(/<[^>]*>/g)) {
        if (tag.startsWith('<v ')) continue;
        const lang = tag.match(/^<lang ([^>]+)>$/);
        if (lang) {
          if (!LANGS.has(lang[1])) fail(`${at}: <lang ${lang[1]}>, only pt-BR or es`);
          if (open) fail(`${at}: nested <lang>`);
          open++;
        } else if (tag === '</lang>') {
          if (!open) fail(`${at}: </lang> without <lang>`);
          open = Math.max(0, open - 1);
        } else {
          fail(`${at}: unexpected tag ${tag}`);
        }
      }
      if (open) fail(`${at}: <lang> left open at the end of a line`);
    }
  }
  if (cues === 0) fail('no cues');
  return { errors, cues, speakers };
}
