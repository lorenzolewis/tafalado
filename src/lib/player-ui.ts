// Connects the page to the player state module (src/lib/player.ts). Imported once by
// src/components/Player.astro; under <ClientRouter /> it runs once per visit, so everything
// that touches a page's own elements happens in `astro:page-load`.
import { formatDuration } from './format';
import { bindMediaSession } from './media-session';
import { fadeInOnLoad } from './motion';
import { seriesOf } from './nav';
import { JUMP_BACK, JUMP_FORWARD, player, type Track } from './player';
import { playControl, playerStatus, progress as fractionDone, timeLeft } from './player-view';
import { progress } from './progress';
import { allTracks } from './tracks';

const time = (seconds: number) => formatDuration(Math.floor(seconds));

const bound = new WeakSet<Element>();

/** The phone's sheet (src/components/Player.astro) is phone-only; the desktop row has everything. */
const DESKTOP = '(min-width: 80rem)';

/**
 * The mini-player is persisted across navigations, so it must be wired up only once: binding it
 * again on each page load would stack listeners and make every click act twice (or more).
 * Some controls are in both the bar and the sheet, so every copy is bound and updated.
 */
function bindMiniPlayer(root: HTMLElement) {
  if (bound.has(root)) return;
  bound.add(root);

  const $$ = <T extends Element>(selector: string) => [...root.querySelectorAll<T>(selector)];
  const titles = $$<HTMLAnchorElement>('[data-title]');
  const texts = $$<HTMLElement>('[data-text]');
  const arts = $$<HTMLImageElement>('[data-art]');
  const toggles = $$<HTMLButtonElement>('[data-action="toggle"]');
  const mutes = $$<HTMLButtonElement>('[data-action="mute"]');
  const rates = $$<HTMLSelectElement>('[data-rate]');
  const seeks = $$<HTMLInputElement>('[data-seek]');
  const currents = $$<HTMLElement>('[data-current]');
  const durations = $$<HTMLElement>('[data-duration]');
  const statuses = $$<HTMLElement>('[data-status]');
  const sheet = root.querySelector<HTMLDialogElement>('[data-sheet-dialog]')!;
  const openSheet = root.querySelector<HTMLButtonElement>('[data-open-label]')!;

  const closeSheet = () => sheet.open && sheet.close();
  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'toggle') player.toggle();
    else if (action === 'back') player.skip(-JUMP_BACK);
    else if (action === 'forward') player.skip(JUMP_FORWARD);
    else if (action === 'mute') player.toggleMute();

    const sheetAction = target.closest<HTMLElement>('[data-sheet]')?.dataset.sheet;
    if (sheetAction === 'open') sheet.showModal();
    else if (sheetAction === 'close') closeSheet();
  });
  // A tap on the backdrop lands on the dialog itself, outside its box (not on its padding).
  sheet.addEventListener('click', (event) => {
    if (event.target !== sheet) return;
    const box = sheet.getBoundingClientRect();
    const inside =
      event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) closeSheet();
  });
  matchMedia(DESKTOP).addEventListener('change', (event) => event.matches && closeSheet());
  document.addEventListener('astro:before-swap', closeSheet);

  // The player is sticky at the bottom, so keep focused and scrolled-to content clear of it. The
  // swap to a new page replaces <html>'s style, so it is set again after each one.
  const setBlockSize = () => document.documentElement.style.setProperty('--player-block-size', `${root.offsetHeight}px`);
  new ResizeObserver(setBlockSize).observe(root);
  document.addEventListener('astro:after-swap', setBlockSize);
  for (const rate of rates) rate.addEventListener('change', () => player.setRate(Number(rate.value)));
  for (const seek of seeks) seek.addEventListener('input', () => player.seek(Number(seek.value)));

  const setText = (el: Element, text: string) => {
    if (el.textContent !== text) el.textContent = text;
  };

  player.subscribe((state) => {
    const { track } = state;
    if (!track) return;
    root.hidden = false;
    root.dataset.state = playerStatus(state);

    for (const title of titles) {
      setText(title, track.title);
      if (title.getAttribute('href') !== track.id) title.href = track.id;
    }
    openSheet.setAttribute('aria-label', `${track.title}, open the player`);
    const text = { title: track.title, series: track.series, left: timeLeft(state) };
    for (const el of texts) setText(el, text[el.dataset.text as keyof typeof text] ?? '');
    // Only on a new lesson, so the image isn't touched on every time update.
    for (const art of arts) {
      if (art.getAttribute('src') === track.artwork) continue;
      art.src = track.artwork;
      fadeInOnLoad(art);
    }
    // The plate takes the lesson's paper (src/components/Player.astro).
    const series = seriesOf(track.id);
    if (series && root.dataset.series !== series) root.dataset.series = series;

    const label = state.paused ? 'Play' : 'Pause';
    for (const toggle of toggles) toggle.setAttribute('aria-label', label);
    for (const mute of mutes) mute.setAttribute('aria-pressed', String(state.muted));
    for (const rate of rates) rate.value = String(state.rate);
    const fraction = fractionDone(state);
    root.style.setProperty('--progress', String(fraction));
    for (const seek of seeks) {
      seek.max = String(Math.floor(state.duration));
      seek.value = String(Math.floor(state.currentTime));
      seek.setAttribute('aria-valuetext', `${time(state.currentTime)} of ${time(state.duration)}`);
      seek.style.setProperty('--seek', `${fraction * 100}%`);
    }
    for (const el of currents) setText(el, time(state.currentTime));
    for (const el of durations) setText(el, time(state.duration));
    const message = state.offline
      ? "You're offline. Audio needs a connection."
      : state.error ? 'The audio could not be loaded.' : '';
    for (const status of statuses) setText(status, message);
  });
}

/**
 * Lesson pages' Play pills (src/components/PlayButton.astro) belong to a page, so they are wired on
 * every page load and released on swap. Only the label and the time beside the pill are written, so
 * the pill's icons stay; `data-state` on the pill's row picks the Play or Pause icon.
 */
function bindPlayButtons(signal: AbortSignal) {
  for (const row of document.querySelectorAll<HTMLElement>('[data-play]')) {
    const track: Track = JSON.parse(row.dataset.play!);
    const button = row.querySelector<HTMLButtonElement>('button')!;
    const label = row.querySelector<HTMLElement>('[data-play-label]')!;
    const left = row.querySelector<HTMLElement>('[data-play-left]')!;
    button.addEventListener(
      'click',
      () => {
        if (player.state.track?.id === track.id) player.toggle();
        else player.play(track);
      },
      { signal },
    );
    const update = () => {
      const control = playControl(player.state, track, progress.get(track.id));
      if (row.dataset.state !== control.status) row.dataset.state = control.status;
      if (label.textContent !== control.label) label.textContent = control.label;
      if (left.textContent !== control.left) left.textContent = control.left;
    };
    player.subscribe(update, { signal });
    progress.subscribe(update, { signal });
  }
}

/** Shortcuts are skipped while typing, and keys a focused control handles itself are left to it. */
function onKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!player.state.track) return;
  const target = event.target as HTMLElement;
  if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;

  switch (event.key) {
    case ' ':
      // A focused button or link already acts on Space.
      if (target.closest('button, a, summary')) return;
      player.toggle();
      break;
    case 'ArrowLeft':
      player.skip(-JUMP_BACK);
      break;
    case 'ArrowRight':
      player.skip(JUMP_FORWARD);
      break;
    case '<':
      player.stepRate(-1);
      break;
    case '>':
      player.stepRate(1);
      break;
    case 'm':
    case 'M':
      player.toggleMute();
      break;
    default:
      return;
  }
  event.preventDefault();
}

document.addEventListener('keydown', onKeydown);

// Lock-screen and notification controls, where the browser has them.
if ('mediaSession' in navigator) bindMediaSession(navigator.mediaSession, player, allTracks());

let page: AbortController | undefined;
document.addEventListener('astro:page-load', () => {
  const root = document.querySelector<HTMLElement>('[data-player]');
  if (root) bindMiniPlayer(root);
  page = new AbortController();
  bindPlayButtons(page.signal);
});
document.addEventListener('astro:before-swap', () => page?.abort());
