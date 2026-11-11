// The phone's views and focus across the page-to-page motion (#53, #63): "‹ Lessons" shows the
// Lessons view, a lesson opens its page, and Back and Forward switch between them on the same page,
// each as a view transition (src/lib/motion.ts). After a navigation, focus is on the new page's
// <main> unless it was kept in the sidebar.
import { devices, expect, test } from '@playwright/test';

test.use({ ...devices['iPhone 15'], defaultBrowserType: undefined });

test('on a phone, the Lessons view and the page switch both ways, and focus lands on the page', async ({ page }) => {
  await page.goto('/pronunciation/02');
  const lessons = page.getByRole('navigation', { name: 'Site and lessons' });
  const main = page.getByRole('main');
  await expect(main).toBeVisible();
  await expect(lessons).toBeHidden();

  // "‹ Lessons": the Lessons view, on the same page.
  await page.getByRole('link', { name: 'Lessons' }).click();
  await expect(page).toHaveURL(/\/pronunciation\/02#lessons$/);
  await expect(lessons).toBeVisible();
  await expect(main).toBeHidden();

  // Back to the page, and Forward to the Lessons view again.
  await page.goBack();
  await expect(main).toBeVisible();
  await expect(lessons).toBeHidden();
  await page.goForward();
  await expect(lessons).toBeVisible();

  // A lesson from the list: its page, with focus on it.
  await lessons.getByRole('link', { name: /Pronunciation 5\b/ }).click();
  await expect(page).toHaveURL(/\/pronunciation\/05$/);
  await expect(main).toBeVisible();
  await expect(main).toBeFocused();

  // Back to the Lessons view of the page before.
  await page.goBack();
  await expect(page).toHaveURL(/\/pronunciation\/02#lessons$/);
  await expect(lessons).toBeVisible();
});

test("the Lessons view's wordmark shows the home page (#111)", async ({ page }) => {
  await page.goto('/#lessons');
  const lessons = page.getByRole('navigation', { name: 'Site and lessons' });
  await expect(lessons).toBeVisible();

  await lessons.getByRole('link', { name: 'Tá Falado' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(lessons).toBeHidden();
});
