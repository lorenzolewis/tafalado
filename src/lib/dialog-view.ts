// How the learner wants a lesson's dialog shown (#93): with or without the Spanish and English
// lines, and with or without the <mark> highlights. One choice for every lesson, kept on this
// device only (ADR 0004), never in the URL, so a shared link opens in the recipient's own view.
import { read, write } from './storage';

export interface DialogView {
  /** Show the Spanish line of each turn. */
  es: boolean;
  /** Show the English line of each turn. */
  en: boolean;
  /** Colour the taught sounds and forms (`<mark>`) in the dialog. */
  marks: boolean;
}

export const DEFAULT_DIALOG_VIEW: Readonly<DialogView> = { es: true, en: true, marks: true };

/** Where the choice is stored (src/lib/storage.ts). */
export const DIALOG_VIEW_STORAGE = 'dialog';

export const isDialogViewKey = (value: unknown): value is keyof DialogView =>
  typeof value === 'string' && Object.hasOwn(DEFAULT_DIALOG_VIEW, value);

/** A stored choice may lack a setting added since it was saved; that one takes its default. */
const isStoredView = (value: unknown): value is Partial<DialogView> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.entries(value).every(([key, on]) => !isDialogViewKey(key) || typeof on === 'boolean');

export function dialogView(): DialogView {
  const stored = read(DIALOG_VIEW_STORAGE, isStoredView) ?? {};
  const view = { ...DEFAULT_DIALOG_VIEW };
  for (const key of Object.keys(view) as (keyof DialogView)[]) view[key] = stored[key] ?? view[key];
  return view;
}

export function setDialogView(change: Partial<DialogView>): DialogView {
  const view = { ...dialogView(), ...change };
  write(DIALOG_VIEW_STORAGE, view);
  return view;
}
