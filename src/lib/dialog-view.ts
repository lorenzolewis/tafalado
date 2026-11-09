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

const KEYS = Object.keys(DEFAULT_DIALOG_VIEW) as (keyof DialogView)[];

const isDialogView = (value: unknown): value is DialogView =>
  typeof value === 'object' &&
  value !== null &&
  KEYS.every((key) => typeof (value as Record<string, unknown>)[key] === 'boolean');

export function dialogView(): DialogView {
  return { ...DEFAULT_DIALOG_VIEW, ...read('dialog', isDialogView) };
}

export function setDialogView(change: Partial<DialogView>): DialogView {
  const view = { ...dialogView(), ...change };
  write('dialog', view);
  return view;
}
