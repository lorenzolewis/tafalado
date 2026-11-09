// A lesson's dialog and study notes on its page (#88): "Dialog & notes ↓" jumps to them; each turn
// gives the speaker, then Portuguese, Spanish and English, each with its lang; the notes follow, with
// the taught sounds highlighted, and a link to the original lesson on COERLL.
import { expect, test } from '@playwright/test';

test('Pronunciation 1 shows its dialog and notes, in their languages', async ({ page }) => {
  await page.goto('/pronunciation/01');
  await expect(page.getByRole('link', { name: /Read the transcript/ })).toHaveCount(0);

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
