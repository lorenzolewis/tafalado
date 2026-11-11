// Find in transcript (#106): the find field in each transcript panel (src/components/TranscriptPanel.astro)
// marks every place the query is said, with "n of m", and steps between them with Enter and
// Shift+Enter (or the arrows beside it). Stepping only scrolls; choosing a line still seeks
// (src/lib/transcript-ui.ts, which binds this to each panel). The matching is src/lib/find-in-cues.ts.
import { findInCues } from './find-in-cues';

/** Where the current match sits in the panel: a bit above the middle. */
const FIND_AT = 0.4;

export interface Find {
  /** Closes the field and forgets the query: the panel is showing another episode. */
  reset(): void;
}

/** What the panel does around finding: stop following playback while there are matches, and follow again after. */
export interface FindHooks {
  onFinding(): void;
  onDone(): void;
}

/** Binds one panel's find field. */
export function bindFind(panel: HTMLElement, box: HTMLElement, { onFinding, onDone }: FindHooks): Find {
  const toggle = panel.querySelector<HTMLButtonElement>('[data-find-toggle]')!;
  const field = panel.querySelector<HTMLElement>('[data-find]')!;
  const input = panel.querySelector<HTMLInputElement>('[data-find-input]')!;
  const status = panel.querySelector<HTMLElement>('[data-find-status]')!;
  /** Each match's marks: one, or several where it crosses a language span. */
  let found: HTMLElement[][] = [];
  let current = -1;

  function unmark() {
    for (const mark of box.querySelectorAll('mark[data-found]')) {
      const parent = mark.parentNode!;
      mark.replaceWith(...mark.childNodes);
      parent.normalize();
    }
    found = [];
    current = -1;
  }

  /** Wraps [start, end) of `el`'s text in marks, one per text node it crosses, so `<i lang>` spans stay whole. */
  function mark(el: Element, start: number, end: number): HTMLElement[] {
    const pieces: [Text, number, number][] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let at = 0;
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const from = Math.max(start, at);
      const to = Math.min(end, at + node.length);
      if (from < to) pieces.push([node, from - at, to - at]);
      at += node.length;
    }
    return pieces.map(([node, from, to]) => {
      const range = document.createRange();
      range.setStart(node, from);
      range.setEnd(node, to);
      const m = document.createElement('mark');
      m.dataset.found = '';
      range.surroundContents(m);
      return m;
    });
  }

  function show(index: number) {
    found[current]?.forEach((m, k) => {
      m.dataset.found = '';
      if (k === 0) m.removeAttribute('aria-current');
    });
    current = index;
    const marks = found[current];
    status.textContent = marks ? `${current + 1} of ${found.length}` : input.value.trim() ? 'No matches' : '';
    if (!marks) return;
    marks.forEach((m) => (m.dataset.found = 'current'));
    marks[0]!.setAttribute('aria-current', 'true');
    onFinding();
    const top = box.scrollTop + marks[0]!.getBoundingClientRect().top - box.getBoundingClientRect().top;
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.scrollTo({ top: top - box.clientHeight * FIND_AT, behavior: smooth ? 'smooth' : 'instant' });
  }

  function find() {
    const had = found.length > 0;
    unmark();
    const texts = [...box.querySelectorAll<HTMLElement>('.cue .text')];
    const matches = findInCues(
      texts.map((t) => t.textContent ?? ''),
      input.value,
    );
    // From the last match back, so wrapping one never moves the offsets of those before it.
    for (let i = matches.length - 1; i >= 0; i--) {
      const { cue, start, end } = matches[i]!;
      found[i] = mark(texts[cue]!, start, end);
    }
    show(found.length ? 0 : -1);
    if (had && !found.length) onDone();
  }

  const step = (by: number) => found.length && show((current + by + found.length) % found.length);

  function open(on: boolean) {
    field.hidden = !on;
    toggle.setAttribute('aria-expanded', String(on));
    if (on) input.focus();
    else {
      input.value = '';
      find();
    }
  }

  toggle.addEventListener('click', () => open(Boolean(field.hidden)));
  input.addEventListener('input', find);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation(); // not also closing the phone sheet's dialog
      open(false);
      toggle.focus();
    }
  });
  for (const button of field.querySelectorAll<HTMLButtonElement>('[data-find-step]')) {
    button.addEventListener('click', () => step(Number(button.dataset.findStep)));
  }

  return {
    reset() {
      // The old episode's lines (and their marks) are already gone.
      field.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      input.value = '';
      found = [];
      current = -1;
      status.textContent = '';
    },
  };
}
