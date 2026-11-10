// A lesson's dialog and study notes on its page (#88): a link down to each section; each turn
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

  await expect(
    page.getByRole('navigation', { name: 'Dialog and notes' }).getByRole('link'),
  ).toHaveText(['Dialog ↓', 'Cultural notes ↓', 'Pronunciation notes ↓']);
  await page.getByRole('link', { name: 'Dialog ↓' }).click();
  await expect(page).toHaveURL(/\/pronunciation\/01#dialog$/);

  const dialog = page.getByRole('region', { name: 'Dialog', exact: true });
  await expect(dialog).toBeInViewport();
  const turns = dialog.locator('ol').getByRole('listitem');
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

  await page.getByRole('link', { name: 'Pronunciation notes ↓' }).click();
  await expect(page.getByRole('heading', { name: 'Pronunciation notes' })).toBeInViewport();

  await expect(page.getByRole('link', { name: 'Original lesson on COERLL' })).toHaveAttribute(
    'href',
    'https://www.coerll.utexas.edu/brazilpod/tafalado/lesson-01.html',
  );
});

test('the learner can hide the translations and the highlights, on every lesson', async ({ page }) => {
  await page.goto('/pronunciation/01');
  const dialog = page.getByRole('region', { name: 'Dialog', exact: true });
  const show = dialog.getByRole('group', { name: 'Show' });
  const first = dialog.locator('ol').getByRole('listitem').first();

  await show.getByRole('checkbox', { name: 'Spanish' }).uncheck();
  await show.getByRole('checkbox', { name: 'Highlights' }).uncheck();
  await expect(dialog.locator('[lang="es"]')).toHaveCount(6);
  for (const line of await dialog.locator('[lang="es"]').all()) await expect(line).toBeHidden();
  await expect(first.locator('[lang="en"]')).toBeVisible();
  await expect(first.locator('p[lang]').getByRole('button')).toHaveCount(0);
  expect(await looksPlain(first.locator('mark').first())).toBe(true);

  // The choice is kept on this device and applies to the next lesson.
  await page.goto('/pronunciation/02');
  const next = page.getByRole('region', { name: 'Dialog', exact: true });
  await expect(next.getByRole('checkbox', { name: 'Spanish' })).not.toBeChecked();
  await expect(next.getByRole('checkbox', { name: 'English' })).toBeChecked();
  await expect(next.locator('[lang="es"]').first()).toBeHidden();
  expect(await looksPlain(next.locator('.turn mark').first())).toBe(true);

  // Pronunciation 24's clips: the lines lose their highlights, the observations explaining them don't.
  await page.goto('/pronunciation/24');
  const clips = page.getByRole('region', { name: 'Clips', exact: true });
  expect(await looksPlain(clips.locator('.turn mark').first())).toBe(true);
  expect(await looksPlain(clips.locator('.observations mark').first())).toBe(false);
});

test('a legend says what each highlight colour marks, and hides with the highlights', async ({ page }) => {
  await page.goto('/pronunciation/01');
  await expect(page.getByRole('list', { name: 'What the highlights mark' }).locator('li > span')).toHaveText([
    'The sound this lesson teaches',
  ]);

  await page.goto('/pronunciation/03');
  const key = page.getByRole('list', { name: 'What the highlights mark' });
  await expect(key.locator('li > span')).toHaveText(['Closed e /ê/', 'Open e /é/']);
  await expect(key.locator('mark.blue')).toHaveCSS('text-decoration-style', 'dashed');
  await page.getByRole('checkbox', { name: 'Highlights' }).uncheck();
  await expect(key).toBeHidden();
});

test('highlights print in the PDF red even when the OS is in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/pronunciation/01');
  const mark = page.locator('.dialog mark').first();
  await expect(mark).toHaveCSS('color', 'rgb(255, 138, 128)');
  await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
  await expect(mark).toHaveCSS('color', 'rgb(198, 40, 40)');
});
