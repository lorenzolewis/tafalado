// Connects the dialog's "Show" checkboxes (src/components/DialogViewControls.astro) to the learner's
// stored choice (src/lib/dialog-view.ts, #93). The CSS hides lines and highlights from the checkboxes
// alone, and an inline script sets them before paint; this saves changes, re-applies the choice where
// localStorage is unavailable (the in-memory copy), and handles "Show Spanish" on one line.
import { dialogView, isDialogViewKey, setDialogView, type DialogView } from './dialog-view';

/** Sets every "Show" checkbox on the page to `view`. */
function apply(view: DialogView) {
  for (const box of document.querySelectorAll<HTMLInputElement>('input[data-view]')) {
    const key = box.dataset.view;
    if (isDialogViewKey(key)) box.checked = view[key];
  }
}

function bind(signal: AbortSignal) {
  document.addEventListener(
    'change',
    (event) => {
      const box = event.target;
      const key = box instanceof HTMLInputElement ? box.dataset.view : undefined;
      if (!isDialogViewKey(key)) return;
      apply(setDialogView({ [key]: (box as HTMLInputElement).checked }));
      // Lines of that language revealed by tap are hidden again with the rest.
      for (const button of document.querySelectorAll<HTMLButtonElement>(`button[data-reveal="${key}"]`))
        button.hidden = false;
    },
    { signal },
  );
  document.addEventListener(
    'click',
    (event) => {
      const button = (event.target as Element | null)?.closest?.<HTMLButtonElement>('button[data-reveal]');
      const line = button?.nextElementSibling;
      if (!button || !(line instanceof HTMLElement)) return;
      button.hidden = true;
      line.focus(); // the button is gone, so focus stays on what it revealed
    },
    { signal },
  );
}

let page: AbortController | undefined;
document.addEventListener('astro:page-load', () => {
  page?.abort();
  page = new AbortController();
  apply(dialogView());
  bind(page.signal);
});
document.addEventListener('astro:before-swap', () => page?.abort());
