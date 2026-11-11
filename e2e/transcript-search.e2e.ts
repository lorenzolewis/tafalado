// Transcript search (#7, #106): the sidebar's lesson filter can also search what is said in each
// episode, and a line found there plays its episode from that time; the transcript panel finds a
// word in the playing episode. The phone sheet's find is in transcript-phone.e2e.ts.
import { expect, test, type Page } from '@playwright/test';
import { checkFind, play, seconds } from './transcript-lines';

const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Site and lessons' });

async function filter(page: Page, query: string) {
  const side = sidebar(page);
  await side.getByRole('button', { name: 'Filter lessons' }).click();
  await side.getByRole('searchbox', { name: 'Filter lessons' }).fill(query);
}

test('the lesson filter also searches transcripts, and a line found plays from there', async ({ page }) => {
  await page.goto('/');
  const side = sidebar(page);
  await filter(page, 'ingresso');
  // Off by default: only titles, topics and intros.
  const box = side.getByRole('checkbox', { name: 'Also search transcripts' });
  await expect(box).not.toBeChecked();
  await expect(side.getByRole('heading', { name: 'In transcripts' })).toBeHidden();

  await box.check();
  await expect(side.getByRole('heading', { name: 'Episodes' })).toBeVisible();
  const hits = side.getByRole('region', { name: 'In transcripts' });
  await expect(hits.getByRole('link', { name: /Pronunciation 13/ }).first()).toBeVisible();
  await expect(side.getByRole('status')).toHaveText(/^\d+ lessons? match(es)?, \d+ lines? in transcripts$/);

  const line = hits.getByRole('button').filter({ hasText: 'ingresso' }).first();
  await expect(line.locator('mark')).toHaveText(/ingresso/i);
  const at = Number(await line.getAttribute('data-hit-start'));
  const lesson = await line.getAttribute('data-hit-lesson');
  expect(lesson).toMatch(/^\/pronunciation\/13/);
  await line.click();

  const player = page.getByRole('region', { name: 'Audio player' });
  await expect(player).toContainText('Pronunciation 13');
  const seek = player.getByRole('slider', { name: 'Seek' });
  await expect.poll(() => seconds(seek), { timeout: 15_000 }).toBeGreaterThanOrEqual(Math.floor(at));
  expect(await seconds(seek)).toBeLessThan(at + 10);

  // Unticked, it's the plain lesson filter again.
  await box.uncheck();
  await expect(side.getByRole('heading', { name: 'In transcripts' })).toBeHidden();
});

test('the transcripts checkbox is remembered on this device', async ({ page }) => {
  await page.goto('/');
  await filter(page, 'coracao');
  await sidebar(page).getByRole('checkbox', { name: 'Also search transcripts' }).check();
  await page.reload();
  await filter(page, 'coracao');
  await expect(sidebar(page).getByRole('checkbox', { name: 'Also search transcripts' })).toBeChecked();
  await expect(sidebar(page).getByRole('heading', { name: 'In transcripts' })).toBeVisible();
});

test('the transcript panel finds a word, steps through the matches and clears', async ({ page }) => {
  await page.goto('/pronunciation/13');
  const player = page.getByRole('region', { name: 'Audio player' });
  await play(page, player.getByRole('slider', { name: 'Seek' }));
  await player.getByRole('button', { name: 'Show transcript' }).click();
  const bar = page.getByRole('complementary', { name: 'Transcript' });
  await checkFind(bar);
});
