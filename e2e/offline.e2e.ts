// Offline browsing (#9, ADR 0006): after one online visit to the home page, lessons never opened
// still load offline, by a full load and through the ClientRouter, with their dialog, notes and
// transcript. Audio needs a connection: the player says so offline, and plays again once back
// online. MP3 byte ranges still reach the range Worker (ADR 0002) under the service worker.
import { expect, test, type Page } from '@playwright/test';

/** The service worker has saved everything and controls the page. */
async function waitForServiceWorker(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
}

async function expectLesson(page: Page, path: RegExp) {
  await expect(page).toHaveURL(path);
  const dialog = page.getByRole('region', { name: 'Dialog', exact: true });
  await expect(dialog.locator('ol').getByRole('listitem').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Grammar notes' })).toBeVisible();
}

test('lessons, transcripts and the player work offline after one visit', async ({ page, context }) => {
  await page.goto('/');
  await waitForServiceWorker(page);

  // Offline, a lesson never opened loads by itself…
  await context.setOffline(true);
  await page.goto('/grammar/05');
  await expectLesson(page, /\/grammar\/05$/);

  // …and through an in-app link (ClientRouter).
  await page.getByRole('navigation', { name: 'Site and lessons' }).getByRole('link', { name: /Grammar 6\b/ }).click();
  await expectLesson(page, /\/grammar\/06$/);

  // Play says why there's no audio, in the player's live region.
  const player = page.getByRole('region', { name: 'Audio player' });
  const status = player.getByRole('status');
  await page.getByRole('main').getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player).toBeVisible();
  await expect(status).toHaveText("You're offline. Audio needs a connection.");

  // The transcript opens with its lines.
  await player.getByRole('button', { name: 'Show transcript' }).click();
  const bar = page.getByRole('complementary', { name: 'Transcript' });
  await expect(bar.getByRole('listitem').first()).toBeVisible();
  expect(await bar.getByRole('listitem').count()).toBeGreaterThan(10);

  // An unknown page shows the saved 404 page.
  const missing = await page.goto('/grammar/99');
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');

  // Back online: the message clears, nothing starts by itself, and Play plays.
  await page.goto('/grammar/06');
  await page.getByRole('main').getByRole('button', { name: 'Play', exact: true }).click();
  await expect(status).toHaveText("You're offline. Audio needs a connection.");
  await context.setOffline(false);
  await expect(status).toHaveText('');
  const seek = player.getByRole('slider', { name: 'Seek' });
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  const from = Number(await seek.inputValue());
  await expect.poll(async () => Number(await seek.inputValue()), { timeout: 15_000 }).toBeGreaterThan(from);
});

test('MP3 byte ranges still get a 206 under the service worker', async ({ page }) => {
  await page.goto('/');
  await waitForServiceWorker(page);
  const status = await page.evaluate(async () => {
    const response = await fetch('/mp3/tafalado_gra_06.mp3', { headers: { Range: 'bytes=0-99' } });
    return response.status;
  });
  expect(status).toBe(206);
});
