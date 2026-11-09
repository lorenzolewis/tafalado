// Connects the dialog's "Show" checkboxes (src/components/DialogViewControls.astro) to the learner's
// stored choice (src/lib/dialog-view.ts, #93). The CSS hides lines and highlights from the checkboxes
// alone, and an inline script sets them before paint; this saves changes, and re-applies the choice
// where localStorage is unavailable (the in-memory copy).
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
      if (isDialogViewKey(key)) apply(setDialogView({ [key]: (box as HTMLInputElement).checked }));
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
