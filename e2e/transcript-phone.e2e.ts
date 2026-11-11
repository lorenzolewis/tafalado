// The episode transcript in the phone's player sheet (#99): it opens there (not in the desktop
// bar), follows the playing line, seeks when a line is chosen, and offers "Back to now" once scrolled;
// its find field works there too (#106).
import { devices, expect, test } from '@playwright/test';
import { checkFind, checkLines } from './transcript-lines';

test.use({ ...devices['iPhone 15'], defaultBrowserType: undefined });

test('the transcript opens in the player sheet, follows and seeks', async ({ page }) => {
  await page.goto('/grammar/03');
  const player = page.getByRole('region', { name: 'Audio player' });
  await page.getByRole('main').getByRole('button', { name: 'Play', exact: true }).click();
  await player.getByRole('button', { name: /, open the player$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Player' });
  const seek = sheet.getByRole('slider', { name: 'Seek' });
  await expect.poll(async () => Number(await seek.getAttribute('max')), { timeout: 15_000 }).toBeGreaterThan(120);

  await sheet.getByRole('button', { name: 'Show transcript' }).click();
  await expect(sheet.getByRole('button', { name: 'Hide transcript' })).toHaveAttribute('aria-expanded', 'true');
  // The desktop bar stays out of the way.
  await expect(page.getByRole('complementary', { name: 'Transcript' })).toBeHidden();
  await checkLines(page, sheet, seek);
});

test('the player sheet finds a word in the transcript', async ({ page }) => {
  await page.goto('/pronunciation/13');
  const player = page.getByRole('region', { name: 'Audio player' });
  await page.getByRole('main').getByRole('button', { name: 'Play', exact: true }).click();
  await player.getByRole('button', { name: /, open the player$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Player' });
  await sheet.getByRole('button', { name: 'Show transcript' }).click();
  await checkFind(sheet);
  // Escape cleared the find, and left the sheet open.
  await expect(sheet).toBeVisible();
});
