// Shared by the transcript e2e tests (transcript.e2e.ts, transcript-phone.e2e.ts). Not *.e2e.ts,
// so Playwright doesn't run it on its own.
import { expect, type Locator, type Page } from '@playwright/test';

export const seconds = async (seek: Locator) => Number(await seek.inputValue());

/** The page's Play button, then wait until the real duration is known so seeks aren't clamped. */
export async function play(page: Page, seek: Locator) {
  await page.getByRole('main').getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(async () => Number(await seek.getAttribute('max')), { timeout: 15_000 }).toBeGreaterThan(120);
}

/** Checks the lines of an open transcript, from the episode's start: choosing one seeks there and makes it the playing line, and scrolling away offers Back to now. */
export async function checkLines(page: Page, transcript: Locator, seek: Locator) {
  const lines = transcript.getByRole('listitem');
  await expect(lines.first()).toBeVisible();
  // The episode opens with music, before the first line: nothing is playing yet.
  await expect(transcript.locator('li[aria-current]')).toHaveCount(0);

  // Choose a line well into the episode: the audio jumps there and the line is the playing one.
  const line = lines.nth(40);
  const at = Number(await line.getByRole('button').getAttribute('data-seek-to'));
  await line.getByRole('button').click();
  await expect.poll(() => seconds(seek)).toBeGreaterThanOrEqual(Math.floor(at));
  expect(await seconds(seek)).toBeLessThan(at + 10);
  await expect(line).toHaveAttribute('aria-current', 'true');
  await expect(transcript.locator('li[aria-current]')).toHaveCount(1);

  // Scrolling the transcript stops it following and offers Back to now, which goes back.
  const now = transcript.getByRole('button', { name: 'Back to now' });
  await expect(now).toBeHidden();
  await transcript.getByRole('list').hover();
  await page.mouse.wheel(0, 2000);
  await expect(now).toBeVisible();
  await now.click();
  await expect(now).toBeHidden();
  await expect(transcript.locator('li[aria-current="true"]')).toBeInViewport();
}
