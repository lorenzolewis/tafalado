// Page-to-page motion (#62, #63), with src/styles/motion.css. Imported once by src/layouts/Base.astro,
// so its listeners are bound once per visit. It sets which way each ClientRouter navigation moves,
// animates the phone's same-page view switch, which the router doesn't, and moves focus after a
// navigation that would otherwise drop it on <body>.
import { navigationDirection, type Direction } from './nav';

const DESKTOP = '(min-width: 80rem)';
/** Read by src/styles/motion.css, as the ClientRouter sets it for its own navigations. */
const DIRECTION_ATTR = 'data-astro-transition';

document.addEventListener('astro:before-preparation', (event) => {
  event.direction = navigationDirection(
    event.from.pathname,
    event.to.pathname,
    event.direction === 'back' ? 'back' : 'forward',
    matchMedia(DESKTOP).matches,
  );
});

let switching = 0;

/**
 * Runs `update` (a switch between the phone's views on the same page) as a view transition in
 * `direction`, or at once where view transitions aren't supported. Returns when the DOM is updated.
 */
export async function switchView(update: () => void, direction: Direction): Promise<void> {
  if (!document.startViewTransition) return update();
  const root = document.documentElement;
  const mine = ++switching;
  root.setAttribute(DIRECTION_ATTR, direction);
  const transition = document.startViewTransition(update);
  // Unless a later switch has taken the attribute over.
  void transition.finished.finally(() => mine === switching && root.removeAttribute(DIRECTION_ATTR));
  await transition.updateCallbackDone;
}

// Focus after a navigation: a click in the persisted sidebar keeps focus on its row (the router
// restores focus inside persisted elements), so the list keeps its place. Anything else would leave
// it on <body>, so it moves to the new page's <main> (tabindex="-1"), without scrolling.
let navigated = false;
document.addEventListener('astro:page-load', () => {
  const active = document.activeElement;
  if (navigated && (!active || active === document.body || !active.checkVisibility())) {
    document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
  }
  navigated = true;
});

/**
 * Fades an image in once it has loaded (src/styles/motion.css), unless it already has, so a cached
 * image shows at once. The lesson photo fades up from its paper. Exported for the player's artwork,
 * whose source changes with the track.
 */
export function fadeInOnLoad(img: HTMLImageElement): void {
  if (!img.getAttribute('src') || img.complete) return;
  img.setAttribute('data-loading', '');
  const done = () => img.removeAttribute('data-loading');
  img.addEventListener('load', done, { once: true });
  img.addEventListener('error', done, { once: true });
}

const fadeInPage = () => document.querySelectorAll<HTMLImageElement>('main img').forEach(fadeInOnLoad);
// Before the new page is painted, so a loading image never shows half-drawn first.
document.addEventListener('astro:after-swap', fadeInPage);
fadeInPage();
