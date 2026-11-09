// A lesson's dialog and study notes on its page (#88): "Dialog & notes ↓" jumps to them; each turn
// gives the speaker, then Portuguese, Spanish and English, each with its lang; the notes follow, with
// the taught sounds highlighted, and a link to the original lesson on COERLL. The learner can hide the
// Spanish, the English and the highlights (#93).
import { expect, test, type Locator } from '@playwright/test';

/** A highlight with the highlighting off: the colour and weight of the line around it. */
const looksPlain = (mark: Locator) =>
  mark.evaluate((m) => {
    const [own, line] = [m, m.closest('p')!].map((el) => getComputedStyle(el));
    return own.color === line.color && own.fontWeight === line.fontWeight;
  });

test('Pronunciation 1 shows its dialog and notes, in their languages', async ({ page }) => {
  await page.goto('/pronunciation/01');

  await page.getByRole('link', { name: 'Dialog & notes ↓' }).click();
  await expect(page).toHaveURL(/\/pronunciation\/01#notes$/);

  const dialog = page.getByRole('region', { name: 'Dialog', exact: true });
  await expect(dialog).toBeInViewport();
  const turns = dialog.getByRole('listitem');
  await expect(turns).toHaveCount(6);
  const first = turns.first();
  await expect(first.locator('.speaker')).toHaveText('Valdo');
  await expect(first.locator('[lang="pt-BR"]')).toHaveText('Que bife gostoso. Acho que vou pedir mais.');
  await expect(first.locator('[lang="es"]')).toHaveText('Qué biftec sabroso. Creo que voy a pedir más.');
  await expect(first.locator('[lang="en"]')).toHaveText("What a tasty steak. I think I'll ask for more.");
  await expect(first.locator('[lang="pt-BR"] mark')).toHaveText(['e', 'i', 'e', 'e', 'i']);

  // The notes, in the PDF's order, after the dialog.
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'Dialog',
    'Cultural notes',
    'Pronunciation notes',
  ]);
  const notes = page.locator('#notes');
  await expect(notes.locator('span[lang="pt-BR-fonipa"]')).toHaveText('/i/');
  await expect(notes.locator('i[lang="pt-BR"]', { hasText: 'visita' }).locator('mark')).toHaveText(['i', 'i']);
  await expect(notes.locator('i[lang="es"]', { hasText: 'bebe' })).toBeVisible();

  await expect(page.getByRole('link', { name: 'Original lesson on COERLL' })).toHaveAttribute(
    'href',
    'https://www.coerll.utexas.edu/brazilpod/tafalado/lesson-01.html',
  );
});

test('the learner can hide the translations and the highlights, on every lesson, and reveal one line', async ({
  page,
}) => {
  await page.goto('/pronunciation/01');
  const dialog = page.getByRole('region', { name: 'Dialog', exact: true });
  const show = dialog.getByRole('group', { name: 'Show' });
  const first = dialog.getByRole('listitem').first();

  await show.getByRole('checkbox', { name: 'Spanish' }).uncheck();
  await show.getByRole('checkbox', { name: 'Highlights' }).uncheck();
  await expect(dialog.locator('[lang="es"]')).toHaveCount(6);
  for (const line of await dialog.locator('[lang="es"]').all()) await expect(line).toBeHidden();
  await expect(first.locator('[lang="en"]')).toBeVisible();
  expect(await looksPlain(first.locator('mark').first())).toBe(true);

  // A hidden line reveals on tap, that line only.
  await first.getByRole('button', { name: 'Show Spanish' }).click();
  await expect(first.locator('[lang="es"]')).toBeVisible();
  await expect(first.locator('[lang="es"]')).toBeFocused();
  await expect(dialog.getByRole('listitem').nth(1).locator('[lang="es"]')).toBeHidden();

  // The choice is kept on this device and applies to the next lesson.
  await page.goto('/pronunciation/02');
  const next = page.getByRole('region', { name: 'Dialog', exact: true });
  await expect(next.getByRole('checkbox', { name: 'Spanish' })).not.toBeChecked();
  await expect(next.getByRole('checkbox', { name: 'English' })).toBeChecked();
  await expect(next.locator('[lang="es"]').first()).toBeHidden();
  expect(await looksPlain(next.locator('mark').first())).toBe(true);
});

test('highlights print in the PDF red even when the OS is in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/pronunciation/01');
  const mark = page.locator('.dialog mark').first();
  await expect(mark).toHaveCSS('color', 'rgb(255, 138, 128)');
  await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
  await expect(mark).toHaveCSS('color', 'rgb(198, 40, 40)');
});
