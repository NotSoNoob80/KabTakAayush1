# Plan — Unify the Projects index to the mobile inline-thumbnail layout at every width

- Status: Proposed
- Date: 2026-06-15
- Scope: `projects.html`, `styles.css`, `script.js`, `index-render.js`.
- Supersedes the desktop model in [ADR 0006](adr/0006-projects-index-pinned-tableau-internal-scroll.md);
  recorded in [ADR 0007](adr/0007-projects-index-unified-inline-thumbnail-list.md).

## Goal

The Projects index looks and functions the same at every width as today's mobile
(inline-thumbnail) layout: one centred, full-page-scrolling list of
`[thumbnail] [num] [title]` rows. No pinned pane, no hover preview, no
wordmark pivot, no more-below cue. On wide screens the list sits in a centred
max-width column, scaled up a notch so it reads as a deliberate page. Pointer
users get one restrained hover: the row's thumbnail drops grayscale to full
colour (the Mosaic's contact-sheet reveal).

## Decisions locked (grilling session)

1. **Full reversal of ADR 0006** — adopt the mobile layout everywhere; supersede,
   don't patch.
2. **Desktop-breathing, not pixel-literal** — same single-column structure, but a
   centred `max-width` column with a slightly larger thumbnail/title on wide
   screens.
3. **One hover affordance, pointer-only** — thumbnail grayscale→colour. No
   preview pane, no "View project →" cue, no layout shift.
4. **Delete the dead machinery**, don't leave it dormant.
5. **Preview pane is deferred, not forbidden** (captured in ADR 0007).

## Changes

### A. `projects.html`

- Remove the **more-below cue** block ([projects.html:44-47](../projects.html)).
- Remove the **preview pane** block ([projects.html:49-58](../projects.html)).
- The `<ul id="project-index-list">` and the surrounding `.index` section stay.

### B. `index-render.js`

- Stop emitting the dead **`index__cue`** span ("View project →") — it was a
  hover affordance with no place in the unified layout
  ([index-render.js:50](../index-render.js)).
- Remove the **preview-frame seed** block ([index-render.js:60-69](../index-render.js)) —
  there is no preview frame to seed.
- Drop the initial `is-active` class on the first row
  ([index-render.js:38](../index-render.js)) — there is no active/preview state.
- Keep emitting `data-thumb` (still used to paint the inline thumbnail) and
  `data-meta` (kept for now; harmless). Re-evaluate `data-meta` if nothing reads
  it after the cut.

### C. `styles.css`

- **Promote the inline layout to the base.** Take the rules currently inside
  `@media (hover: none), (pointer: coarse), (max-width: 768px)`
  ([styles.css:811-898](../styles.css)) and make them the unconditional `.index*`
  rules. The `.index.index` specificity prefixes can drop once they're the base.
- **Delete the desktop tableau CSS**: the grid / pinned / internal-scroll
  `.index`, the `.index__list` fixed-height + mask + scrollbar rules, the
  `.index__preview*` rules, the `.index__mark` / pivot rules, and the
  `@media (max-width: 980px)` compact block
  ([styles.css:1102-1540](../styles.css)).
- **Delete the more-below cue CSS**: `.index__more*`, `.index.has-more`,
  `@keyframes index-more-bob`, and its reduced-motion rule
  ([styles.css:1114-1156](../styles.css)).
- **Add the centred desktop column** (new rule, applies at wider widths):
  - `.index__list` (or a wrapper): `max-width: ~760px; margin-inline: auto`.
  - At `min-width: 769px`: thumbnail `~88×110`, title cap raised to `~44px`
    (mobile keeps `clamp(24px, 7vw, 38px)`).
- **Add the pointer-only hover** — `@media (hover: hover)`:
  `.index__item:hover .index__item::before { filter: grayscale(0) brightness(1); }`
  with a `filter` transition (mirror the Mosaic's
  [styles.css:1606](../styles.css)). (Implementation note: the thumbnail is a
  `::before`; hover lives on the row, so the selector targets the pseudo-element
  on `:hover`.)
- Keep the `@media (max-width: 640px)` index tweaks that still apply (row
  gap/padding); drop the `.index__cue { display:none }` there (the element is
  gone).

### D. `script.js`

- The `indexInlineThumbs` flag is now always-true → **remove the branch
  altogether**. Keep only the inline-layout body
  ([script.js:913-928](../script.js)): paint each row's `--thumb`, and the click
  handler that sets `kta:from-projects` for the mosaic reveal.
- **Delete the entire `else if` desktop branch**
  ([script.js:929-1028+](../script.js)): the hover-swap engine, the
  mouseenter/focus/mouseleave wiring, and the more-below cue measurement
  (`updateMoreCue`, the scroll/resize listeners, the count text).
- Remove the now-unused `indexPreviewImg` / `indexPreviewMeta` lookups
  ([script.js:889-890](../script.js)) if nothing else references them.

## Out of scope / unchanged

- The Manifest (`projects-data.js`) and the row data model — untouched.
- The Mosaic, the Void, the Listing, the footer, the nav.
- The site-wide **small screen** term (ADR 0001) — still governs the Listing,
  footer glissando, and Void density; the index simply no longer branches on it.

## Verification matrix

| Viewport | Expectation |
|----------|-------------|
| 390×800 (phone) | Unchanged from today's mobile layout. |
| 768×1000 | Same single-column list; no preview pane appears. |
| 1024×768 | Centred max-width column; larger thumb/title; **no** pinned pane, **no** more-below cue, **no** preview pane. |
| 1440×900 | List centred (not hugging the left); page scrolls as one; footer reads as a normal section below the list. |

For each, confirm:

- [ ] One scroll context — the whole page scrolls; no internal list scroll, no edge-fade mask.
- [ ] Every row shows its thumbnail; tapping/clicking a row navigates to the project.
- [ ] Pointer device: hovering a row brings *only* its thumbnail to full colour; no preview swaps, no cue text, no layout shift.
- [ ] No preview pane, wordmark pivot, or more-below cue anywhere at any width.
- [ ] `kta:from-projects` is still set on click → the staggered mosaic reveal still fires.
- [ ] `prefers-reduced-motion`: thumbnail colour-on-hover has no transition jank; nothing else animates.
- [ ] Console clean — no references to removed `project-index-preview-*` / `project-index-count` elements.

## Documentation (done this session)

- **CONTEXT.md** — Projects index, Inline thumbnail, and Wordmark entries
  updated; Preview pane and More-below cue entries removed; wordmark pivot
  retired.
- **ADR 0006** — marked Superseded.
- **ADR 0007** — records the reversal and the deferred-not-forbidden status of
  the preview pane.
