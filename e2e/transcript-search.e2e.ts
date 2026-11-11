// Transcript search (#7, #106): from two characters, the sidebar's lesson filter also searches what is said in each
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
  const hits = side.getByRole('region', { name: 'In transcripts' });
  // One character: only titles, topics and intros, as before.
  await filter(page, 'i');
  await expect(hits).toBeHidden();

  // "ingresso" is only said in Pronunciation 12 and 13: no lesson matches, but their lines do.
  await side.getByRole('searchbox', { name: 'Filter lessons' }).fill('ingresso');
  await expect(side.getByRole('status')).toHaveText(/^0 lessons match, \d+ lines in transcripts$/);
  await expect(hits.getByRole('link', { name: /Pronunciation 13/ }).first()).toBeVisible();
  await expect(side.locator('.list li:not([hidden])')).toHaveCount(0);

  const line = hits.getByRole('button').filter({ hasText: 'ingresso' }).first();
  await expect(line.locator('mark')).toHaveText(/ingresso/i);
  const at = Number(await line.getAttribute('data-hit-start'));
  expect(await line.getAttribute('data-hit-lesson')).toMatch(/^\/pronunciation\/13/);
  await line.click();

  const player = page.getByRole('region', { name: 'Audio player' });
  await expect(player).toContainText('Pronunciation 13');
  const seek = player.getByRole('slider', { name: 'Seek' });
  await expect.poll(() => seconds(seek), { timeout: 15_000 }).toBeGreaterThanOrEqual(Math.floor(at));
  expect(await seconds(seek)).toBeLessThan(at + 10);
});

test('the lessons the filter matches stay listed in full above the transcript lines', async ({ page }) => {
  await page.goto('/');
  const side = sidebar(page);
  // "nh": a few lessons are about it, and it's said on hundreds of lines.
  await filter(page, 'nh');
  await expect(side.getByRole('status')).toHaveText(/^\d+ lessons match, \d+ lines in transcripts$/);
  const lessons = Number((await side.getByRole('status').textContent())!.split(' ')[0]);
  expect(lessons).toBeGreaterThan(1);
  await expect(side.locator('.list li:not([hidden])')).toHaveCount(lessons);
  await expect(side.locator('.hit')).toHaveCount(50);
  await expect(side.getByRole('button', { name: /^Show more lines/ })).toBeVisible();
});

test('the transcript panel finds a word, steps through the matches and clears', async ({ page }) => {
  await page.goto('/pronunciation/13');
  const player = page.getByRole('region', { name: 'Audio player' });
  await play(page, player.getByRole('slider', { name: 'Seek' }));
  await player.getByRole('button', { name: 'Show transcript' }).click();
  const bar = page.getByRole('complementary', { name: 'Transcript' });
  await checkFind(bar);
});
