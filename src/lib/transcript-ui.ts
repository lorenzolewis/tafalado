// Wires the transcript to the persistent player (#99) and the dialog's turns to the audio (#94).
// Imported once by src/components/TranscriptBar.astro, so (like player-ui.ts) it runs once per
// visit; what touches a page's own elements happens in `astro:page-load`.
//
// - One panel (TranscriptPanel.astro) in two places: the phone sheet and the desktop bar on the
//   right, opened by the same "Show transcript" toggle (TranscriptToggle.astro), with one open state.
//   Only one of them is on screen at a time. It always shows the playing episode's transcript.
// - The panel follows the playing line until the learner scrolls it, then offers "Back to now".
//   Every line is a button that jumps there.
// - Each dialog turn has a play button that jumps to its first reading, and is lit (`data-reading`)
//   while any of its readings plays.
import { player, type PlayerState, type Track } from './player';
import { seriesOf } from './nav';
import { seekTo } from './seek';
import { bindFind, type Find } from './transcript-find-ui';
import type { Reading, TranscriptData } from './transcript';
import { cueAt, cuesHtml, readingAt } from './transcript-view';
import { allTracks } from './tracks';

const DESKTOP = matchMedia('(min-width: 80rem)');
/** Where the playing line sits in the panel while it follows: about a third of the way down. */
const FOLLOW_AT = 0.3;

let open = false;

/** Where a lesson's transcript is. Looked up in the player's list, which has it for every lesson
 *  (src/components/Player.astro), as a track may come from elsewhere (a page's Play button). */
const transcriptOf = (track: Track | null) => track && allTracks().find((t) => t.id === track.id)?.transcript;

/** Puts the open state on the toggles, the bar, and <html> (which the sheet's and the page's styles key on). */
function apply() {
  const track = player.state.track;
  const available = Boolean(transcriptOf(track));
  const shown = open && available;
  if (shown) document.documentElement.dataset.transcriptOpen = '';
  else delete document.documentElement.dataset.transcriptOpen;
  const bar = document.querySelector<HTMLElement>('[data-transcript-bar]');
  if (bar) {
    bar.hidden = !(shown && DESKTOP.matches);
    // The bar takes the playing lesson's paper, like the player.
    const series = track && seriesOf(track.id);
    if (series) bar.dataset.series = series;
  }
  for (const toggle of document.querySelectorAll<HTMLButtonElement>('[data-transcript-toggle]')) {
    toggle.hidden = !available;
    toggle.setAttribute('aria-expanded', String(shown));
    toggle.querySelector('[data-transcript-label]')!.textContent = shown ? 'Hide transcript' : 'Show transcript';
  }
  // Whatever just appeared starts at the playing line.
  requestAnimationFrame(() => followAll(true));
}

// ── The phone sheet's change of layout ──

/** As the sheet itself slides up (src/components/Player.astro). */
const SHEET_MOTION: KeyframeAnimationOptions = { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };
let sheetMotion: Animation[] = [];

/**
 * Runs `change` (which opens or closes the transcript) and, in the open phone sheet, animates
 * between the two layouts: the sheet grows or shrinks from its foot, the art folds away or back, and
 * the panel fades in or out in its place. Both ends run in the open layout, a flex column whose panel
 * takes the space left, so the controls below it ride along with the sheet's height; closing swaps
 * to the closed layout once the motion ends.
 */
function animateSheet(change: () => void) {
  for (const a of sheetMotion) a.cancel();
  sheetMotion = [];
  const sheet = document.querySelector<HTMLDialogElement>('[data-sheet-dialog]');
  const art = sheet?.querySelector<HTMLElement>('.art.big');
  const title = sheet?.querySelector<HTMLElement>('.sheet-title');
  const panel = sheet?.querySelector<HTMLElement>('[data-transcript-panel]');
  if (!sheet?.open || !art || !title || !panel || DESKTOP.matches || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    change();
    return;
  }
  const root = document.documentElement.dataset;
  const measure = () => {
    const style = getComputedStyle(panel);
    const artStyle = getComputedStyle(art);
    return {
      height: sheet.offsetHeight,
      art: { width: `${art.offsetWidth}px`, opacity: artStyle.opacity, marginBottom: artStyle.marginBottom },
      title: getComputedStyle(title).fontSize,
      margin: [style.marginTop, style.marginBottom],
      gap: getComputedStyle(sheet).rowGap,
    };
  };
  const before = measure();
  change();
  const after = measure();
  const opening = 'transcriptOpen' in root;
  if (before.height === after.height && before.art.width === after.art.width) return;

  const [from, to] = opening ? [before, after] : [after, before];
  // The panel shown, and with no room: no margin, and its gap in the column taken back.
  const shown = { opacity: 1, marginTop: to.margin[0], marginBottom: to.margin[1] };
  const shut = { opacity: 0, marginTop: '0px', marginBottom: `-${to.gap}` };
  if (!opening) root.transcriptOpen = ''; // close in the open layout, then swap
  const run = (el: Element, keyframes: Keyframe[]) =>
    sheetMotion.push(el.animate(opening ? keyframes : [...keyframes].reverse(), SHEET_MOTION));
  run(sheet, [{ height: `${from.height}px` }, { height: `${to.height}px` }]);
  // Visible throughout, so it can fold away.
  run(art, [{ ...from.art, visibility: 'visible' }, { ...to.art, visibility: 'visible' }]);
  run(title, [{ fontSize: from.title }, { fontSize: to.title }]);
  run(panel, [shut, shown]);
  const mine = sheetMotion;
  Promise.all(mine.map((a) => a.finished)).then(
    () => {
      if (!opening && !open) delete root.transcriptOpen;
      followAll(true);
    },
    () => {}, // cancelled by the next toggle, which sets the state itself
  );
}

// ── The playing episode's transcript ──

const loaded = new Map<string, Promise<TranscriptData | null>>();
function load(url: string) {
  let data = loaded.get(url);
  if (!data) {
    data = fetch(url)
      .then((response) => (response.ok ? (response.json() as Promise<TranscriptData>) : null))
      .catch(() => null);
    loaded.set(url, data);
  }
  return data;
}

/** A panel's scroll box, which follows the playing line until the learner scrolls it. */
interface Follower {
  box: HTMLElement;
  now: HTMLButtonElement;
  following: boolean;
  /** The track whose lines are in the box. */
  lesson?: string;
  starts: number[];
  find: Find;
}
const followers: Follower[] = [];

function bindPanel(panel: HTMLElement) {
  const box = panel.querySelector<HTMLElement>('[data-transcript-scroll]')!;
  const now = panel.querySelector<HTMLButtonElement>('[data-transcript-now]')!;
  const stop = () => {
    if (!box.querySelector('.cue[aria-current]')) return;
    follower.following = false;
    now.hidden = false;
  };
  // While finding, the panel stays on the matches (even before any line has played); Back to now
  // still returns to the playing line, and clearing the find follows it again.
  const find = bindFind(panel, box, {
    onFinding: () => {
      follower.following = false;
      now.hidden = false;
    },
    onDone: () => resume(follower, true),
  });
  const follower: Follower = { box, now, following: true, starts: [], find };
  box.addEventListener('wheel', stop, { passive: true });
  box.addEventListener('touchmove', stop, { passive: true });
  box.addEventListener('pointerdown', (event) => event.target === box && stop()); // its scrollbar
  box.addEventListener('keydown', (event) => ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key) && stop());
  box.addEventListener('click', (event) => {
    const line = (event.target as Element).closest<HTMLElement>('[data-seek-to]');
    if (!line || !follower.lesson) return;
    // Picking a line is choosing where to be: follow from there.
    resume(follower, false);
    seekTo(follower.lesson, Number(line.dataset.seekTo));
  });
  now.addEventListener('click', () => resume(follower, true));
  followers.push(follower);
}

function resume(follower: Follower, scroll: boolean) {
  follower.following = true;
  follower.now.hidden = true;
  if (scroll) follow(follower, false);
}

function follow(follower: Follower, instant: boolean) {
  const { box } = follower;
  const line = box.querySelector<HTMLElement>('.cue[aria-current]');
  // Not while it's off screen (the closed sheet, the hidden bar): it starts at the line when shown.
  if (!line || !follower.following || box.offsetParent === null) return;
  const top = line.offsetTop - box.offsetTop - box.clientHeight * FOLLOW_AT + line.offsetHeight / 2;
  const smooth = !instant && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  box.scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' });
}
const followAll = (instant = false) => followers.forEach((f) => follow(f, instant));

async function fill(track: Track) {
  const mine = followers.filter((f) => f.lesson !== track.id);
  if (!mine.length) return;
  for (const f of mine) {
    f.lesson = track.id;
    f.starts = [];
    f.find.reset(); // the old episode's matches go with it
    f.box.innerHTML = '<p class="empty">Loading…</p>';
  }
  const url = transcriptOf(track);
  const data = url ? await load(url) : null;
  for (const f of mine) {
    if (f.lesson !== track.id) continue; // another lesson started meanwhile
    f.box.innerHTML = data ? cuesHtml(data.cues) : '<p class="empty">The transcript didn’t load.</p>';
    f.starts = data?.cues.map((cue) => cue.start) ?? [];
    resume(f, false);
  }
  update(player.state);
  followAll(true);
}

// ── Following the audio ──

function update({ track, currentTime }: PlayerState) {
  let moved = false;
  for (const f of followers) {
    const list = f.box.querySelector('.cues');
    if (!list) continue;
    const i = f.lesson === track?.id ? cueAt(f.starts, currentTime) : -1;
    const current = i >= 0 ? list.children[i] : null;
    const before = list.querySelector(':scope > [aria-current]');
    if (before === current) continue;
    before?.removeAttribute('aria-current');
    current?.setAttribute('aria-current', 'true');
    moved = true;
  }
  if (moved) followAll();

  // The dialog's turns: lit while any of their readings plays.
  for (const [turn, { lesson, readings }] of turns) {
    const k = lesson === track?.id ? readingAt(readings, currentTime) : -1;
    if (k === -1) turn.removeAttribute('data-reading');
    else turn.dataset.reading = `${k + 1}/${readings.length}`;
  }
}

// ── The dialog's turns on this page ──

const turns = new Map<HTMLElement, { lesson: string; readings: Reading[] }>();

function bindDialog(signal: AbortSignal) {
  turns.clear();
  for (const list of document.querySelectorAll<HTMLElement>('[data-turns-of]')) {
    const lesson = list.dataset.turnsOf!;
    for (const turn of list.querySelectorAll<HTMLElement>('[data-readings]')) {
      turns.set(turn, { lesson, readings: JSON.parse(turn.dataset.readings!) as Reading[] });
    }
    list.addEventListener(
      'click',
      (event) => {
        const button = (event.target as Element).closest<HTMLElement>('[data-seek-to]');
        if (button) seekTo(lesson, Number(button.dataset.seekTo));
      },
      { signal },
    );
  }
}

// ── Wiring ──

let bound = false;
let page: AbortController | undefined;
let lastTrack: string | undefined;

document.addEventListener('astro:page-load', () => {
  if (!bound) {
    bound = true;
    for (const panel of document.querySelectorAll<HTMLElement>('[data-transcript-panel]')) bindPanel(panel);
    // The toggles live in the persisted player, so one listener serves every page.
    document.querySelector('[data-player]')?.addEventListener('click', (event) => {
      if (!(event.target as Element).closest('[data-transcript-toggle]')) return;
      open = !open;
      animateSheet(apply);
    });
    // The sheet starts at the playing line each time it opens.
    document.querySelector('[data-sheet-dialog]')?.addEventListener('toggle', () => requestAnimationFrame(() => followAll(true)));
    DESKTOP.addEventListener('change', apply);
    player.subscribe((state) => {
      if (state.track && state.track.id !== lastTrack) {
        lastTrack = state.track.id;
        fill(state.track);
        apply();
      }
      update(state);
    });
  }
  page = new AbortController();
  bindDialog(page.signal);
  apply();
  update(player.state);
});
document.addEventListener('astro:before-swap', () => page?.abort());
// The swap brings the new page's <html> attributes, so put the open state back on.
document.addEventListener('astro:after-swap', apply);
