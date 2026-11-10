// PROTOTYPE (#99, #94): throwaway, dev only. Wires the transcript to the persistent player: one
// panel (TranscriptPanelProto.astro), in the phone sheet and in the desktop bar on the right, opened
// by the same "Show transcript" toggle (TranscriptToggleProto.astro) in both; it follows the playing
// line until scrolled ("Back to now"), and every line is a button that jumps there. Also the dialog
// turns' tap-to-seek and read-along. Imported once by src/components/TranscriptProtoShell.astro, so (like
// player-ui.ts) it runs once per visit.
import { player, type PlayerState } from './player';
import { allTracks } from './tracks';

interface Cue { start: number; end: number; speaker: string; html: string }
interface Reading { start: number; end: number; firstCue: number; lastCue: number }
interface TranscriptData { cues: Cue[]; turns: Reading[][] }

const DESKTOP = matchMedia('(min-width: 52rem)');
/** One open state for both: only one of the sheet and the bar is on screen at a time. */
const ui = { open: false };

const stamp = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const esc = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const fileId = (trackId: string) => trackId.slice(1).replace('/', '-');

function apply() {
  const root = document.documentElement.dataset;
  const open = ui.open && Boolean(player.state.track);
  root.protoTxOpen = String(open);
  const dock = document.querySelector<HTMLElement>('[data-proto-dock-el]');
  if (dock) dock.hidden = !(open && DESKTOP.matches);
  for (const toggle of document.querySelectorAll<HTMLButtonElement>('[data-proto-toggle]')) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Hide transcript' : 'Show transcript';
  }
  // Whatever just appeared starts at the playing line.
  requestAnimationFrame(() => followAll(true));
}

// ── The playing episode's transcript ──

const cache = new Map<string, Promise<TranscriptData | null>>();
const load = (trackId: string) => {
  if (!cache.has(trackId)) {
    cache.set(
      trackId,
      fetch(`/transcripts/${fileId(trackId)}.json`).then((r) => (r.ok ? (r.json() as Promise<TranscriptData>) : null)).catch(() => null),
    );
  }
  return cache.get(trackId)!;
};

/** Each line is one button: the time, the speaker (read on every line, shown when it changes), the text. */
function listHtml(trackId: string, data: TranscriptData) {
  const items = data.cues.map((cue, i) => {
    const repeat = i > 0 && data.cues[i - 1].speaker === cue.speaker;
    return (
      `<li class="proto-cue" data-start="${cue.start}"${repeat ? ' data-repeat' : ''}>` +
      `<button type="button" class="proto-line" data-seek-to="${cue.start}">` +
      `<span class="proto-time">${stamp(cue.start)}</span>` +
      `<span class="proto-who${repeat ? ' visually-hidden' : ''}">${esc(cue.speaker)}<span class="visually-hidden">:</span></span>` +
      `<span class="proto-text">${cue.html}</span></button></li>`
    );
  });
  return `<ol class="proto-cues" data-cues data-lesson="${trackId}">${items.join('')}</ol>`;
}

/** Scroll boxes that follow the playing line until the learner scrolls them. */
interface Follower { box: HTMLElement; now: HTMLButtonElement; following: boolean }
const followers: Follower[] = [];

function makeFollower(panel: HTMLElement): Follower {
  const box = panel.querySelector<HTMLElement>('[data-proto-scroll]')!;
  const now = panel.querySelector<HTMLButtonElement>('[data-proto-now]')!;
  const follower: Follower = { box, now, following: true };
  const stop = () => {
    if (!box.querySelector('[aria-current]')) return;
    follower.following = false;
    now.hidden = false;
  };
  box.addEventListener('wheel', stop, { passive: true });
  box.addEventListener('touchmove', stop, { passive: true });
  box.addEventListener('pointerdown', (e) => e.target === box && stop()); // the scrollbar
  box.addEventListener('keydown', (e) => ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key) && stop());
  // Picking a line is choosing where to be: follow from there.
  box.addEventListener('click', (e) => (e.target as Element).closest('[data-seek-to]') && resume(follower, false));
  now.addEventListener('click', () => resume(follower, true));
  followers.push(follower);
  return follower;
}

function resume(follower: Follower, scroll: boolean) {
  follower.following = true;
  follower.now.hidden = true;
  if (scroll) follow(follower, false);
}

function follow(follower: Follower, instant: boolean) {
  const { box } = follower;
  const cue = box.querySelector<HTMLElement>('[aria-current]');
  if (!cue || !follower.following || box.offsetParent === null) return;
  const top = cue.offsetTop - box.offsetTop - box.clientHeight * 0.3 + cue.offsetHeight / 2;
  box.scrollTo({ top, behavior: instant || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
const followAll = (instant = false) => followers.forEach((f) => follow(f, instant));

async function fillPlayerLists(trackId: string) {
  if (followers.every((f) => f.box.dataset.lesson === trackId)) return;
  for (const f of followers) {
    f.box.dataset.lesson = trackId;
    f.box.innerHTML = '<p class="proto-empty">Loading…</p>';
  }
  const data = await load(trackId);
  for (const f of followers) {
    if (f.box.dataset.lesson !== trackId) continue;
    f.box.innerHTML = data
      ? listHtml(trackId, data)
      : '<p class="proto-empty">No transcript for this lesson in the prototype: play Grammar 3.</p>';
    resume(f, false);
  }
  update(player.state);
  followAll(true);
}

// ── Highlights ──

const starts = new WeakMap<Element, number[]>();
const cueStarts = (list: Element) => {
  let s = starts.get(list);
  if (!s) {
    s = [...list.children].map((li) => Number((li as HTMLElement).dataset.start));
    starts.set(list, s);
  }
  return s;
};
const indexAt = (s: number[], t: number) => {
  let lo = -1;
  let hi = s.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (s[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
};

function update(state: PlayerState) {
  const id = state.track?.id;
  const t = state.currentTime;
  let moved = false;

  for (const list of document.querySelectorAll<HTMLElement>('[data-cues]')) {
    const i = list.dataset.lesson === id ? indexAt(cueStarts(list), t) : -1;
    const current = i >= 0 ? (list.children[i] as HTMLElement) : null;
    const before = list.querySelector('[aria-current]');
    if (before !== current) {
      before?.removeAttribute('aria-current');
      current?.setAttribute('aria-current', 'true');
      moved = true;
    }
  }

  // Dialog turns: lit while any of their readings plays.
  for (const turn of document.querySelectorAll<HTMLElement>('[data-proto-turn]')) {
    const readings: Reading[] = JSON.parse(turn.dataset.protoTurn!);
    const k = turn.dataset.lesson === id ? readings.findIndex((r) => t >= r.start && t < r.end) : -1;
    if (k === -1) delete turn.dataset.protoReading;
    else turn.dataset.protoReading = `${k + 1}/${readings.length}`;
  }

  if (moved) followAll();
}

// ── Seeking ──

function seekTo(trackId: string, seconds: number) {
  if (player.state.track?.id !== trackId) {
    const track = allTracks().find((t) => t.id === trackId);
    if (!track) return;
    player.play(track);
  }
  player.seek(seconds);
  if (player.state.paused) player.play();
}

// ── Wiring ──

function bindOnce() {
  for (const panel of document.querySelectorAll<HTMLElement>('[data-proto-panel]')) makeFollower(panel);

  document.addEventListener('click', (event) => {
    const target = event.target as Element;
    const seek = target.closest<HTMLElement>('[data-seek-to]');
    if (seek) {
      const lesson = seek.closest<HTMLElement>('[data-lesson]')?.dataset.lesson;
      if (lesson) seekTo(lesson, Number(seek.dataset.seekTo));
      return;
    }
    if (target.closest('[data-proto-toggle]')) {
      ui.open = !ui.open;
      apply();
    }
  });

  // The sheet: start at the playing line each time it opens.
  document.querySelector('[data-sheet-dialog]')?.addEventListener('toggle', () => requestAnimationFrame(() => followAll(true)));
  DESKTOP.addEventListener('change', apply);

  let lastTrack: string | undefined;
  player.subscribe((state) => {
    if (state.track && state.track.id !== lastTrack) {
      lastTrack = state.track.id;
      fillPlayerLists(state.track.id);
      apply();
    }
    update(state);
  });
}

/** The dialog turns of this page: a play button on each, and the readings to light them by. */
function bindDialog() {
  const source = document.querySelector<HTMLElement>('[data-proto-readings]');
  if (!source) return;
  const readings: Reading[][] = JSON.parse(source.textContent || '[]');
  const lesson = source.dataset.lesson!;
  document.querySelectorAll<HTMLElement>('.dialog .turn').forEach((turn, i) => {
    const r = readings[i] ?? [];
    turn.dataset.protoTurn = JSON.stringify(r);
    turn.dataset.lesson = lesson;
    const speaker = turn.querySelector('.speaker');
    if (!speaker || speaker.querySelector('.proto-turn-play, .proto-turn-miss')) return;
    if (!r.length) {
      speaker.insertAdjacentHTML('beforeend', ' <span class="proto-turn-miss">not found in transcript</span>');
      return;
    }
    speaker.insertAdjacentHTML(
      'beforeend',
      ` <button type="button" class="proto-turn-play" data-seek-to="${r[0].start}" aria-label="Play this line, from ${stamp(r[0].start)}">▶ ${stamp(r[0].start)}</button>` +
        `<span class="proto-turn-count">read ${r.length}×</span>`,
    );
  });
}

let bound = false;
document.addEventListener('astro:after-swap', apply);
document.addEventListener('astro:page-load', () => {
  if (!bound) {
    bound = true;
    bindOnce();
  }
  bindDialog();
  apply();
  update(player.state);
});
