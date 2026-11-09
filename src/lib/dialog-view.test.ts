import { beforeEach, describe, expect, it, vi } from 'vitest';

// storage.ts keeps every value in memory too, so each test gets fresh modules.
async function load() {
  vi.resetModules();
  return { ...(await import('./dialog-view')), storage: await import('./storage') };
}

describe('dialog view', () => {
  beforeEach(() => globalThis.localStorage?.clear());

  it('shows both translations and the highlights until the learner chooses otherwise', async () => {
    const { dialogView } = await load();
    expect(dialogView()).toEqual({ es: true, en: true, marks: true });
  });

  it('remembers a choice, keeping the other settings', async () => {
    const { dialogView, setDialogView } = await load();
    setDialogView({ es: false });
    setDialogView({ marks: false });
    expect(dialogView()).toEqual({ es: false, en: true, marks: false });
  });

  it('falls back to the default when the stored value is not a dialog view', async () => {
    const { dialogView, storage } = await load();
    storage.write('dialog', { es: 'no', en: true, marks: true });
    expect(dialogView()).toEqual({ es: true, en: true, marks: true });
  });

  it('keeps a stored choice that predates a setting, giving that setting its default', async () => {
    const { dialogView, storage } = await load();
    storage.write('dialog', { en: false });
    expect(dialogView()).toEqual({ es: true, en: false, marks: true });
  });
});
