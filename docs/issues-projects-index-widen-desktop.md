# Issues — Widen the Projects index list on desktop with a right-anchored meta line

- Source PRD: [prd-projects-index-widen-desktop.md](prd-projects-index-widen-desktop.md)
- Date: 2026-06-15
- Tracker: none configured. These are paste-ready issue bodies; expected
  starting state is `ready-for-agent` if a tracker is wired up later.

---

## Issue 1 — Renderer emits `.index__meta` span, hidden via base CSS

**Type:** AFK
**User stories covered:** 8, 9, 14, 15, 16

### Parent

PRD: [prd-projects-index-widen-desktop.md](prd-projects-index-widen-desktop.md)

### What to build

Teach the Manifest-driven Projects index renderer to emit a meta span on
every row, and hide it by default in the base stylesheet so mobile and
tablet are pixel-identical to today.

The row template in the renderer gains a `.index__meta` span sibling to
`.index__title` inside the same `<a class="index__item">`. The span is
populated from the project's existing `meta` Manifest field, escaped with
the renderer's existing `esc()` helper, and falls back to an empty string
when `meta` is missing or empty — so partial Manifest data renders an
empty span rather than crashing the row's flex layout.

The base stylesheet hides `.index__meta` (`display: none`) so this slice
introduces zero observable change below the desktop breakpoint. Desktop
visibility and layout land in Issue 2.

No changes to `projects.html`, `script.js`, or the Manifest in
`projects-data.js`. No new ADR.

### Acceptance criteria

- [ ] Every row rendered by `index-render.js` contains a `.index__meta`
      span as a sibling of `.index__title`, in that order.
- [ ] The meta span content is escaped via the renderer's `esc()` helper.
- [ ] A project whose Manifest entry is missing `meta` (or has an empty
      string) renders an empty `.index__meta` span, not nothing.
- [ ] `.index__meta { display: none; }` is present as a base rule in
      `styles.css` so the span is hidden at every width.
- [ ] At 360 px, 411 px, and 768 px the rendered page is pixel-identical
      to `main` — same column width (760 px), no visible meta, no layout
      shift.
- [ ] No hand-authored `<li>` rows are introduced in `projects.html`
      (ADR 0004 single-source-of-truth preserved).
- [ ] The hover engine in `script.js` is untouched and the
      grayscale→colour thumbnail reveal still works on pointer hover.

### Blocked by

None — can start immediately.

---

## Issue 2 — Desktop widening + right-anchored meta layout (≥769px)

**Type:** AFK
**User stories covered:** 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 19

### Parent

PRD: [prd-projects-index-widen-desktop.md](prd-projects-index-widen-desktop.md)

### What to build

Inside the existing `@media (min-width: 769px)` block in `styles.css`,
widen the centred Projects index column and reveal the meta span emitted
by Issue 1 as a right-anchored secondary line on every row.

The list cap is raised from 760 px to 1100 px. `.index__meta` switches
from `display: none` to `display: block` (or `flex`, if alignment
requires it). The meta is right-anchored within the existing flex row by
making `.index__title` continue to take `flex: 1 1 auto` and giving
`.index__meta` `flex: 0 0 auto` with `text-align: right` — no grid is
introduced. The row already uses `align-items: flex-start`, so when a
long title wraps to 2–3 lines the meta stays anchored to the title's
first line, matching the inline thumbnail's contact-sheet anchor.

The meta reads in a quiet secondary tone — small, uppercase-tracked, dim
(in the `--gold-dim` family used by `.index__num`). It must not compete
with the big display title. Exact font-size and tracking values are
tuned in the browser.

`.index__meta` gets a sensible `max-width` and a controlled wrap or
truncate strategy so the longest real Manifest meta — id 03's
*"Photowalk · Sassoon Docks, Mumbai"* — contains tidily on its side
without crushing the title's flex space. The exact strategy (wrap vs.
ellipsis truncate) is decided in the browser against the binding case.

No new motion, no new hover affordance — the grayscale→colour thumbnail
reveal remains the only hover affordance on the row. The bottom rules
between rows naturally stretch to the new wider cap with no rule change.
The keyboard focus ring on the whole row continues to work unchanged.

### Acceptance criteria

- [ ] Inside `@media (min-width: 769px)`, `.index__list` is capped at
      `max-width: 1100px` (base 760 px rule untouched).
- [ ] Inside the same media block, `.index__meta` is visible and pinned
      to the right edge of the row (`flex: 0 0 auto`, right-aligned).
- [ ] The meta visual tone is small, uppercase-tracked, dim secondary
      (gold-dim family), quieter than the display title.
- [ ] At 1280 px, 1440 px, and 1920 px: every row reads
      title-left / meta-right; bottom rules frame end-to-end across the
      wider column.
- [ ] At 2560 px (4K): the title and meta stay within the 1100 px column
      and do not drift to opposite far edges.
- [ ] On id 03 (*"Photowalk · Sassoon Docks, Mumbai"*): the meta wraps or
      truncates tidily on its side without crushing the title.
- [ ] On the longest title that wraps to 2–3 lines: the meta stays
      anchored to the title's first line (top-aligned).
- [ ] Every row's meta on desktop matches that project's `meta` field in
      the Manifest — no drift versus the project's own page.
- [ ] Pointer hover: grayscale→colour thumbnail reveal works exactly as
      it does today; the meta does not animate or react to hover.
- [ ] `prefers-reduced-motion` enabled: behaviour is unchanged versus
      today.
- [ ] Keyboard tabbing through rows still shows the whole-row focus ring;
      the meta does not steal focus.
- [ ] At 360 px, 411 px, and 768 px the page is still pixel-identical to
      `main` — no regression from this slice.
- [ ] All widening rules live inside the existing
      `@media (min-width: 769px)` block; no new breakpoint introduced.

### Blocked by

Issue 1 — Renderer emits `.index__meta` span, hidden via base CSS.

---

## Issue 3 — CONTEXT.md glossary refinement (no new ADR)

**Type:** AFK
**User stories covered:** 17, 18

### Parent

PRD: [prd-projects-index-widen-desktop.md](prd-projects-index-widen-desktop.md)

### What to build

Update `CONTEXT.md` so the glossary stops describing the Projects index
row as title-only on desktop. The **Projects index** entry and the
**Inline thumbnail** vocabulary entry both gain a note that on desktop
(≥769px) each row also shows a right-anchored "type · location" meta
line — the same canonical string already shown under the heading on a
project's own page.

Frame the amendment as a **refinement** of ADR 0007 (keeps the unified
centred column, single page scroll, and pointer-only grayscale reveal),
not a reversal. Do **not** create a new ADR; the change does not earn
one.

No code changes in this issue.

### Acceptance criteria

- [ ] `CONTEXT.md`'s **Projects index** glossary entry states that on
      desktop each row also shows a right-anchored "type · location"
      meta line, and that mobile/tablet stay title-only.
- [ ] `CONTEXT.md`'s **Inline thumbnail** vocabulary entry is updated
      consistently with the Projects index entry.
- [ ] The amendment is framed as a refinement of ADR 0007, not a
      reversal.
- [ ] No new ADR file is created in `docs/adr/`.
- [ ] No code files are modified by this issue.

### Blocked by

None — can run in parallel with Issues 1 and 2.
