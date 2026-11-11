// A link to the page already shown does nothing (#111): the wordmark on the home page starts no
// ClientRouter navigation, so no swap, no view transition and no scroll jump. From any other page
// it still goes home through the router. On a phone the wordmark is in the Lessons view, at
// #lessons, so it leads to the home page there (e2e/views.e2e.ts).
import { expect, test, type Page } from '@playwright/test';

/** Counts the ClientRouter's navigations from here on: the window is kept across its swaps. */
async function countNavigations(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { navigations: number };
    w.navigations = 0;
    document.addEventListener('astro:before-preparation', () => w.navigations++);
  });
  return () => page.evaluate(() => (window as unknown as { navigations: number }).navigations);
}

test('on desktop, the wordmark on the home page does nothing, and goes home from any other page', async ({
  page,
}) => {
  await page.goto('/');
  const wordmark = page.getByRole('link', { name: 'Tá Falado' });
  const navigations = await countNavigations(page);
  // The page itself, marked, so a swap would show as a new <main>.
  await page.evaluate(() => document.querySelector('main')!.setAttribute('data-before', ''));
  // On desktop the page scrolls in its own pane, beside the sidebar.
  const scrollTop = () => page.evaluate(() => document.querySelector('main')!.scrollTop);
  await page.evaluate(() => document.querySelector('main')!.scrollTo(0, 600));
  const scrolled = await scrollTop();
  expect(scrolled).toBeGreaterThan(0);

  await wordmark.click();
  await wordmark.press('Enter');
  // Long enough for a navigation to have started and swapped.
  await page.waitForTimeout(500);
  expect(await navigations()).toBe(0);
  await expect(page.locator('main[data-before]')).toHaveCount(1);
  expect(await scrollTop()).toBe(scrolled);
  await expect(page).toHaveURL(/\/$/);

  // From a lesson page: home, through the router.
  await page.getByRole('navigation', { name: 'Site and lessons' }).getByRole('link', { name: /Grammar 3\b/ }).click();
  await expect(page).toHaveURL(/\/grammar\/03$/);
  await wordmark.click();
  await expect(page).toHaveURL(/\/$/);
  expect(await navigations()).toBe(2);
});
