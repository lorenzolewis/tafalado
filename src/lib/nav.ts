// Which view the phone shows for a path (#53), and the paths' shared rules for the sidebar's current
// row. Shared by src/layouts/Base.astro (the first render) and src/lib/sidebar-ui.ts
// (every navigation), so both apply the same rules.
import { SERIES, type Series } from './series';

/** The phone shows one at a time: the home page, any other page, or the Lessons view. */
export type View = 'home' | 'page' | 'lessons';

/** The phone's Lessons view is this fragment on any page, so it has a URL and Back leaves it. */
export const LESSONS_ID = 'lessons';

const LESSON_PATH = new RegExp(`^/(${SERIES.join('|')})/\\d\\d$`);

/** `/grammar/17` for `/grammar/17.html`: the path without the `.html` the static build may serve. */
export function pagePath(pathname: string): string {
  return pathname.replace(/(\/index)?\.html$/, '') || '/';
}

/** The series of a lesson page's path (`/grammar/03` → `grammar`), or undefined for any other page. */
export function seriesOf(pathname: string): Series | undefined {
  const match = LESSON_PATH.exec(pagePath(pathname));
  return match ? (match[1] as Series) : undefined;
}

/** The phone's view for a path and its fragment. */
export function viewOf(pathname: string, hash = ''): View {
  if (hash === `#${LESSONS_ID}`) return 'lessons';
  return pagePath(pathname) === '/' ? 'home' : 'page';
}

/** Which way a navigation moves through the sheets (#62): onto a new sheet, or back to one underneath. */
export type Direction = 'forward' | 'back';

/**
 * The direction of a ClientRouter navigation, from the one history gives. On desktop home is the
 * bottom sheet, so going home from any other page is always Back, even from a link. On a phone home
 * is reached from the Lessons view and opens forward like any page.
 */
export function navigationDirection(from: string, to: string, history: Direction, desktop: boolean): Direction {
  if (desktop && pagePath(to) === '/' && pagePath(from) !== '/') return 'back';
  return history;
}

/** The direction of the phone's same-page switch between views: the Lessons view is underneath every page. */
export function viewSwitchDirection(to: View): Direction {
  return to === 'lessons' ? 'back' : 'forward';
}

/**
 * Whether a link leads to the page already shown (#111): the same path and query, with no fragment
 * on either. The ClientRouter would fetch, swap and transition to it again; a fragment (such as
 * #lessons) it handles on the same page itself.
 */
export function isCurrentPage(href: URL, here: URL): boolean {
  return (
    href.origin === here.origin &&
    pagePath(href.pathname) === pagePath(here.pathname) &&
    href.search === here.search &&
    !href.hash &&
    !here.hash
  );
}
