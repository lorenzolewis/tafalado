// The icon set (#52, plus home, back and close from #53): a 24px grid with sharp
// geometry, 2.5px strokes with square caps and mitred joins, and solid shapes (class "f").
// Drawn by src/components/Icon.astro; the stroke styles are in src/styles/base.css.
//
// One family: marks stay inside the 20px live area (2–22), rings are r 8.75 on the centre, solid
// marks are a stroke (2.5) wide, and solids sit a little smaller than outlines since they read heavier.
export const ICONS = {
  // Centroid on x 12, 16 tall like the pause bars.
  play: '<path class="f" d="M7.5 4 20.5 12 7.5 20z"/>',
  pause: '<path class="f" d="M5.5 4h4.5v16H5.5zM14 4h4.5v16H14z"/>',
  // Skip: big numerals (12.5px, see base.css) under a shallow arrow, readable at 16–20px.
  back10: '<path d="M20 9.5A9.5 9.5 0 0 0 8.5 4.25"/><path class="f" d="M2.5 4.5 8.5 1v7z"/><text x="12" y="21.5">10</text>',
  forward30: '<path d="M4 9.5A9.5 9.5 0 0 1 15.5 4.25"/><path class="f" d="M21.5 4.5 15.5 1v7z"/><text x="12" y="21.5">30</text>',
  // Waves concentric on the cone's apex; mute's cross takes the waves' box.
  volume: '<path class="f" d="M2.5 9h4l6-5v16l-6-5h-4z"/><path d="M15.5 9.25a4 4 0 0 1 0 5.5M18.25 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path class="f" d="M2.5 9h4l6-5v16l-6-5h-4z"/><path d="m16 9.5 5 5m0-5-5 5"/>',
  search: '<circle cx="10.25" cy="10.25" r="6.5"/><path d="m15.25 15.25 5.25 5.25"/>',
  check: '<path d="M4 12.5 9 17.5 20 6.5"/>',
  // The off state of a toggle pill (src/components/DialogViewControls.astro): tap to add it back.
  plus: '<path d="M12 4.5v15M4.5 12h15"/>',
  doc: '<path class="f" fill-rule="evenodd" d="M5.5 2.5h8.5l4.5 4.5v14.5h-13zm3 9.5v2.5h7V12zm0 4.5v2.5h4.5v-2.5zM13 4v4h4z"/>',
  chevron: '<path class="f" d="M6 9.5h12l-6 6.5z"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z"/>',
  // An Alegreya-style "i" (flag and foot), its dot clear of the stem so they don't merge at 20px.
  back: '<path d="M15.5 4.5 8 12l7.5 7.5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  // The lesson page's links down to its notes sections (src/pages/[series]/[number].astro).
  // Dialog and clips: two speech bubbles, the reply behind.
  dialog: '<path d="M2.5 3.5h12.5v9.5H8.5L4.5 16.5V13h-2z"/><path d="M18.5 8.5h3v9.5h-2v3.5l-4-3.5H10V16"/>',
  // Cultural notes: a globe, ring r 8.75 with a meridian and the equator.
  globe: '<circle cx="12" cy="12" r="8.75"/><ellipse cx="12" cy="12" rx="3.75" ry="8.75"/><path d="M3.25 12h17.5"/>',
  // Pronunciation notes: a waveform, tallest at the centre.
  wave: '<path d="M3.5 10v4M8 6.5v11M12.25 3v18M16.5 6.5v11M20.75 10v4"/>',
  // Grammar notes: an open book, square-cornered.
  book: '<path d="M2.5 5h6.5l3 2 3-2h6.5v13.5H15l-3 2-3-2H2.5zM12 7v13.5"/>',
  // Charts: a table with a header column.
  table: '<path d="M2.5 4.5h19v15h-19zM2.5 9.5h19M2.5 14.5h19M9 4.5v15"/>',
} as const;

export type IconName = keyof typeof ICONS;
