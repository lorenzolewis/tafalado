// What the transcript panel and the dialog's read-along show (#99, #94), as pure functions of the
// data and the time, so unit tests reach them without the DOM. src/lib/transcript-ui.ts puts them
// on the page.
import { formatDuration } from './format';
import type { Cue, Reading } from './transcript';

/** The chip on a line that is all one language. */
const LANG_CHIP: Record<string, string> = { 'pt-BR': 'PT', es: 'ES' };

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** `0:03`, `12:04`: where a line or a turn starts. */
export const stamp = (seconds: number) => formatDuration(Math.floor(seconds));

/** The index of the cue playing at `time`: the last one started by then (`starts` ascending), or -1. */
export function cueAt(starts: number[], time: number): number {
  let lo = -1;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= time) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Which of a turn's readings is playing at `time`, or -1. */
export const readingAt = (readings: Reading[], time: number) => readings.findIndex((r) => time >= r.start && time < r.end);

/**
 * The transcript's lines. Each is one button (the time, a chip when the whole line is Portuguese or
 * Spanish, the speaker, the text) that seeks there. The speaker shows when it changes; on repeats it
 * is visually hidden, so screen readers still hear it on every line.
 */
export function cuesHtml(cues: Cue[]): string {
  const items = cues.map((cue, i) => {
    const repeat = i > 0 && cues[i - 1].speaker === cue.speaker;
    const chip = cue.lang && LANG_CHIP[cue.lang];
    return (
      `<li class="cue"${repeat ? ' data-repeat' : ''}>` +
      `<button type="button" class="line" data-seek-to="${cue.start}">` +
      `<span class="gutter"><span class="time">${stamp(cue.start)}</span>` +
      (chip ? `<span class="lang-chip" data-lang="${cue.lang}" aria-hidden="true">${chip}</span>` : '') +
      `</span>` +
      `<span class="who${repeat ? ' visually-hidden' : ''}">${escape(cue.speaker)}<span class="visually-hidden">:</span></span>` +
      `<span class="text">${cue.html}</span>` +
      `</button></li>`
    );
  });
  return `<ol class="cues">${items.join('')}</ol>`;
}
