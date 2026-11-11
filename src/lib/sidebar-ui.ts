// Wires the persisted sidebar (src/components/Sidebar.astro) and the phone's views (#53). Imported
// once by the sidebar, so it runs once per visit: the sidebar is kept across navigations, so its
// filter is bound once, while the current row and the phone's view are updated on every page.
import { navigate } from 'astro:transitions/client';
import { createLessonFilter } from './lesson-filter';
import { switchView } from './motion';
import { LESSONS_ID, isCurrentPage, pagePath, viewOf, viewSwitchDirection, type View } from './nav';
import { LINE_PAGE, searchView, type HitGroup } from './search-view';
import { seekTo } from './seek';
import { escape, stamp } from './transcript-view';
import {
  MIN_TRANSCRIPT_QUERY,
  TRANSCRIPT_CUES_PATH,
  createTranscriptSearch,
  markedHtml,
  type TranscriptCues,
  type TranscriptHit,
} from './transcript-search';

const bound = new WeakSet<Element>();
/** How long the lesson filter waits after a keystroke before showing results. */
const SEARCH_DELAY_MS = 120;
/** Shows one series' lessons with no query (or every series, for null). Set once the sidebar is bound. */
let showOnly: ((id: string | null) => void) | undefined;

/** The transcript search, built once from the cue file, which is fetched when the filter first opens. */
let transcriptSearch: Promise<((query: string) => TranscriptHit[]) | null> | undefined;
/** Null when it didn't load; opening the filter again tries again (`retry`). */
function loadTranscriptSearch(retry = false) {
  if (retry) transcriptSearch = undefined;
  transcriptSearch ??= fetch(TRANSCRIPT_CUES_PATH)
    .then((response) => (response.ok ? (response.json() as Promise<TranscriptCues>) : Promise.reject()))
    .then(createTranscriptSearch)
    .catch(() => null);
  return transcriptSearch;
}

/** The In transcripts section's lines, under each episode's name (which links to its lesson). */
function groupsHtml(groups: HitGroup[], rows: HTMLElement[]): string {
  return groups
    .map(({ row, hits }) => {
      const el = rows[row]!;
      const href = el.dataset.lesson!;
      const name = el.querySelector('.row-title')!.textContent!.trim();
      const number = el.querySelector('.number')!.textContent!.trim();
      const sub = el.querySelector('.row-sub')!.textContent!.replace(/\s+/g, ' ').trim();
      const lines = hits
        .map(
          (h) =>
            `<li><button type="button" class="hit" data-hit-lesson="${href}" data-hit-start="${h.start}">` +
            `<span class="hit-time">${stamp(h.start)}</span><span class="hit-text">${markedHtml(h.text, h.ranges)}</span></button></li>`,
        )
        .join('');
      return (
        `<li class="hit-group" data-series="${el.dataset.series}">` +
        `<a class="hit-lesson" href="${href}"><span class="hit-number" aria-hidden="true">${escape(number)}</span>${escape(name)}` +
        `<span class="visually-hidden">, ${escape(sub)}</span></a><ol>${lines}</ol></li>`
      );
    })
    .join('');
}

function bindSidebar(root: HTMLElement) {
  if (bound.has(root)) return;
  bound.add(root);

  const $ = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const input = $<HTMLInputElement>('#lesson-filter');
  const search = $<HTMLElement>('#lesson-search');
  const toggle = $<HTMLButtonElement>('[data-search-toggle]');
  const status = $<HTMLElement>('#lesson-filter-status');
  const empty = $<HTMLElement>('[data-empty]');
  const pillAll = $<HTMLButtonElement>('[data-pill-all]');
  const pills = [...root.querySelectorAll<HTMLButtonElement>('[data-pill]')];
  const rows = [...root.querySelectorAll<HTMLElement>('[data-filter-text]')];
  const rowSeries = rows.map((row) => row.dataset.series!);
  const rowLessons = rows.map((row) => row.dataset.lesson!);
  const filter = createLessonFilter(rows.map((row) => row.dataset.filterText!));
  const hitsSection = $<HTMLElement>('[data-hits]');
  const hitsLoading = $<HTMLElement>('[data-hits-loading]');
  const hitGroups = $<HTMLElement>('[data-hit-groups]');
  const moreLines = $<HTMLButtonElement>('[data-more-lines]');
  let series: string | null = null;
  /** The transcript search once loaded; until then a query shows the transcripts as loading. */
  let searchTranscripts: ((query: string) => TranscriptHit[]) | undefined;
  // "Show more lines": reset by each new query.
  let lineLimit = LINE_PAGE;
  let shownQuery = '';
  let shownGroups = '';

  /** The cue file didn't load: no lines until the filter is opened again, rather than refetching on every keystroke. */
  let failed = false;
  /**
   * Fetches the cue file if it isn't loaded: when the filter opens (so it's usually there by the
   * first word typed), or on a search (a value the browser restored, with the filter opened for it).
   */
  function ensureTranscripts(opened = false) {
    if (searchTranscripts) return;
    if (!opened && (failed || input.value.trim().length < MIN_TRANSCRIPT_QUERY)) return;
    const retry = failed;
    failed = false;
    void loadTranscriptSearch(retry).then((search) => {
      if (search) searchTranscripts = search;
      else failed = true;
      update();
    });
  }

  function update() {
    const query = input.value;
    if (query !== shownQuery) {
      shownQuery = query;
      lineLimit = LINE_PAGE;
    }
    ensureTranscripts();
    const hits = searchTranscripts ? searchTranscripts(query) : failed ? [] : 'loading';
    const view = searchView({ query, matches: filter(query), rowLessons, rowSeries, series, hits, lineLimit });
    rows.forEach((row, i) => (row.hidden = view.hidden[i]!));
    hitsSection.hidden = !view.transcripts;
    hitsLoading.hidden = !view.loading && !(failed && view.transcripts);
    hitsLoading.textContent = failed ? 'The transcripts didn’t load. Close and reopen the filter to try again.' : 'Loading transcripts…';
    const groups = groupsHtml(view.groups, rows);
    if (groups !== shownGroups) {
      shownGroups = groups;
      hitGroups.innerHTML = groups;
    }
    moreLines.hidden = view.moreLines === 0;
    moreLines.textContent = `Show more lines (${view.moreLines})`;
    for (const pill of pills) {
      const id = pill.dataset.pill!;
      pill.hidden = !view.pills[id];
      pill.setAttribute('aria-pressed', String(id === series));
      pill.querySelector('[data-pill-count]')!.textContent = String(view.counts[id] ?? 0);
    }
    // "All episodes": pressed when no series is, counting the query's matches across every series.
    pillAll.setAttribute('aria-pressed', String(series === null));
    const all = Object.values(view.counts).reduce((sum, n) => sum + n, 0);
    pillAll.querySelector('[data-pill-count]')!.textContent = String(all);
    empty.hidden = !view.empty;
    if (status.textContent !== view.status) status.textContent = view.status;
  }

  function setSeries(id: string | null) {
    series = id;
    update();
  }
  showOnly = (id) => {
    input.value = '';
    openSearch(false);
    setSeries(id);
  };
  // The results follow typing after a short pause, so the list reads as the filter at work rather
  // than flickering on every keystroke. Pills and Clear stay immediate.
  let pending: number | undefined;
  input.addEventListener('input', () => {
    clearTimeout(pending);
    pending = window.setTimeout(update, SEARCH_DELAY_MS);
  });
  for (const pill of pills) {
    pill.addEventListener('click', () => setSeries(series === pill.dataset.pill ? null : pill.dataset.pill!));
  }
  pillAll.addEventListener('click', () => setSeries(null));
  // "Show more lines" hides once there's no more, so focus goes on to the first line it showed.
  moreLines.addEventListener('click', () => {
    const before = hitGroups.querySelectorAll('.hit').length;
    lineLimit += LINE_PAGE;
    update();
    hitGroups.querySelectorAll<HTMLElement>('.hit')[before]?.focus();
  });
  // A line plays its episode from there, whichever is playing.
  hitGroups.addEventListener('click', (event) => {
    const hit = (event.target as Element).closest<HTMLElement>('[data-hit-start]');
    if (hit) seekTo(hit.dataset.hitLesson!, Number(hit.dataset.hitStart));
  });
  $('[data-clear]').addEventListener('click', () => {
    input.value = '';
    setSeries(null);
    input.focus();
  });
  // The search button opens the field; closing it clears the filter.
  function openSearch(open: boolean) {
    search.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', () => {
    const open = Boolean(search.hidden);
    openSearch(open);
    if (open) {
      input.focus();
      ensureTranscripts(true);
    } else if (input.value) {
      input.value = '';
      update();
    }
  });
  if (input.value) openSearch(true); // the browser may have restored a value
  update();
}

/** Marks the current page in the sidebar, and picks the phone's view from the URL. */
function syncPage() {
  const sidebar = document.querySelector<HTMLElement>('[data-sidebar]');
  const app = document.querySelector<HTMLElement>('[data-app]');
  if (!sidebar || !app) return;
  const view = viewOf(location.pathname, location.hash);
  const here = pagePath(location.pathname);
  const mark = (el: Element | null, on: boolean) =>
    on ? el?.setAttribute('aria-current', 'page') : el?.removeAttribute('aria-current');

  mark(sidebar.querySelector('[data-nav="home"]'), here === '/');
  for (const link of sidebar.querySelectorAll('.list a')) mark(link, link.getAttribute('href') === here);
  app.dataset.view = view;
  syncedPath = location.pathname;
}

/** The path syncPage last showed: a popstate on it is a switch between the phone's views. */
let syncedPath = location.pathname;
/** The view switch under way, so a second request for the same view joins it. */
let switching: { view: View; done: Promise<void> } | undefined;

/**
 * Shows the phone's view for the URL on the same page, as a sheet moving (src/lib/motion.ts): the
 * Lessons view is underneath every page. Resolves once the view has switched.
 */
function showView(): Promise<void> {
  const app = document.querySelector<HTMLElement>('[data-app]');
  const view = viewOf(location.pathname, location.hash);
  if (switching?.view === view) return switching.done;
  if (!app || app.dataset.view === view) {
    syncPage();
    return Promise.resolve();
  }
  const done = switchView(syncPage, viewSwitchDirection(view)).finally(() => {
    if (switching?.done === done) switching = undefined;
  });
  switching = { view, done };
  return done;
}

const LESSONS_HASH = `#${LESSONS_ID}`;

/**
 * Opens the phone's Lessons view: #lessons on the current page. Through the ClientRouter, so the
 * history entry is one it can go Back from (it ignores the entries of plain fragment links), and
 * then shown here, since the router doesn't swap anything for a same-page fragment.
 */
async function openLessons() {
  if (location.hash !== LESSONS_HASH) await navigate(LESSONS_HASH);
  // The router may already have started this switch, with the popstate it fires for a new fragment.
  await showView();
  scrollTo(0, 0);
}

/**
 * "All 46 lessons" on the home page (shown only on a phone): the Lessons view with the whole list,
 * no series or query, from its top. Exported for the home page's script.
 */
export function showAllLessons() {
  showOnly?.(null);
  document.querySelector('[data-sidebar] [data-results]')?.scrollTo(0, 0);
  void openLessons();
}

// Links to #lessons (the phone's "‹ Lessons" button). Captured before the ClientRouter's
// own click handler, which then leaves the click alone.
document.addEventListener(
  'click',
  (event) => {
    const link = (event.target as Element).closest?.('a');
    if (!link || link.getAttribute('href') !== LESSONS_HASH || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void openLessons();
  },
  { capture: true },
);

// Links to the page already shown, such as the wordmark on the home page (#111): nothing to do.
// The ClientRouter would fetch, swap and transition to the same page again. Captured before its
// click handler, which then leaves the click alone; modified, middle and new-tab clicks keep the
// browser's own handling.
document.addEventListener(
  'click',
  (event) => {
    const link = (event.target as Element).closest?.('a');
    if (!link?.href || event.button !== 0 || event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    if (link.dataset.astroReload !== undefined) return;
    if (isCurrentPage(new URL(link.href), new URL(location.href))) event.preventDefault();
  },
  { capture: true },
);

document.addEventListener('astro:page-load', () => {
  const sidebar = document.querySelector<HTMLElement>('[data-sidebar]');
  if (sidebar) bindSidebar(sidebar);
  syncPage();
});
// Before the new page is painted, so the phone never flashes the wrong view.
document.addEventListener('astro:after-swap', syncPage);
// Back and Forward into and out of #lessons on the same page swap nothing, so the view switches
// here. Between pages the ClientRouter swaps, and syncPage runs again after it.
addEventListener('popstate', () => (location.pathname === syncedPath ? void showView() : syncPage()));
