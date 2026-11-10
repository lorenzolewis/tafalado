// The episode transcript in the player on desktop (#99) and the dialog's tap-to-seek and read-along
// (#94): the transcript opens in a bar on the right, follows the playing line (aria-current), seeks
// when a line is chosen, and offers "Back to now" once scrolled; a turn's play button seeks to its
// reading, and the turn is lit while it plays. The phone is transcript-phone.e2e.ts.
import { expect, test } from '@playwright/test';
import { checkLines, play, seconds } from './transcript-lines';

test('the transcript opens in a bar beside the page, follows and seeks', async ({ page }) => {
  await page.goto('/grammar/03');
  const player = page.getByRole('region', { name: 'Audio player' });
  const seek = player.getByRole('slider', { name: 'Seek' });
  await play(page, seek);

  const toggle = player.getByRole('button', { name: 'Show transcript' });
  await toggle.click();
  await expect(player.getByRole('button', { name: 'Hide transcript' })).toHaveAttribute('aria-expanded', 'true');
  const bar = page.getByRole('complementary', { name: 'Transcript' });
  await expect(bar).toBeVisible();
  await checkLines(page, bar, seek);

  // It stays open, on the same episode, on another page.
  await page.getByRole('navigation', { name: 'Site and lessons' }).getByRole('link', { name: /Grammar 4\b/ }).click();
  await expect(page).toHaveURL(/\/grammar\/04$/);
  await expect(bar).toBeVisible();
  await expect(bar.locator('li[aria-current="true"]')).toHaveCount(1);

  await player.getByRole('button', { name: 'Hide transcript' }).click();
  await expect(bar).toBeHidden();
});

test('a dialog turn plays from its reading and is lit while it plays', async ({ page }) => {
  await page.goto('/grammar/03');
  const player = page.getByRole('region', { name: 'Audio player' });
  const seek = player.getByRole('slider', { name: 'Seek' });
  const dialog = page.getByRole('region', { name: 'Dialog', exact: true });
  const turn = dialog.locator('ol').getByRole('listitem').nth(2);
  const button = turn.getByRole('button', { name: /^Play this turn, from \d+:\d{2}$/ });
  const at = Number(await button.getAttribute('data-seek-to'));

  // Nothing playing yet: the button loads the lesson and starts it there.
  await button.click();
  await expect(player).toBeVisible();
  await expect.poll(() => seconds(seek), { timeout: 15_000 }).toBeGreaterThanOrEqual(Math.floor(at));
  expect(await seconds(seek)).toBeLessThan(at + 10);
  await expect(turn).toHaveAttribute('data-reading', /^1\/\d+$/);
  await expect(dialog.locator('li[data-reading]')).toHaveCount(1);
});
