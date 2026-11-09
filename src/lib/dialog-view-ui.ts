// Connects the dialog's "Show" checkboxes (src/components/DialogViewControls.astro) to the learner's
// stored choice (src/lib/dialog-view.ts, #93). The CSS hides lines and highlights from the checkboxes
// alone; this restores them on each page, saves changes, and handles "Show Spanish" on one line.
import { dialogView, setDialogView, type DialogView } from './dialog-view';

const isKey = (value: string | undefined): value is keyof DialogView =>
  value === 'es' || value === 'en' || value === 'marks';

/** Sets every "Show" checkbox on the page to `view`, and hides again any line revealed by tap. */
function apply(view: DialogView) {
  for (const box of document.querySelectorAll<HTMLInputElement>('input[data-view]')) {
    const key = box.dataset.view;
    if (isKey(key)) box.checked = view[key];
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-reveal]')) button.hidden = false;
}

function bind(signal: AbortSignal) {
  document.addEventListener(
    'change',
    (event) => {
      const box = event.target;
      if (!(box instanceof HTMLInputElement) || !isKey(box.dataset.view)) return;
      apply(setDialogView({ [box.dataset.view]: box.checked }));
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

// Before the new page is painted on client-side navigation (ADR 0001), so it doesn't flash.
document.addEventListener('astro:after-swap', () => apply(dialogView()));

let page: AbortController | undefined;
document.addEventListener('astro:page-load', () => {
  page?.abort();
  page = new AbortController();
  apply(dialogView());
  bind(page.signal);
});
document.addEventListener('astro:before-swap', () => page?.abort());
