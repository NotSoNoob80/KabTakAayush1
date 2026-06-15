# Plan — Widen the Projects index list on desktop

## Goal

On desktop, the Projects index list (`projects.html`) is stranded in a narrow
centred column, leaving large empty gutters on its left and right. Widen the
column and give each row a **right-anchored meta line** so the new horizontal
space is filled with real content (title left, "type · location" right) rather
than dead space. Mobile/tablet stay exactly as they are today.

## Current state

- `.index__list` is capped at `max-width: 760px`, centred — the source of the
  desktop gutters. [styles.css:960](styles.css)
- Each row (`.index__item`) is a left-aligned flex of `.index__num` +
  `.index__title` only; the title is `flex: 1 1 auto`. There is **no** meta on
  the row today. [styles.css:980](styles.css)
- Rows are generated from the Manifest by
  [index-render.js](index-render.js) — markup is not hand-authored in
  `projects.html` (see ADR 0004). Each project in the Manifest already carries a
  `meta` string, e.g. `"Photowalk · Mumbai"`.
  [projects-data.js:30](projects-data.js)
- The wide-screen tuning lives in the `@media (min-width: 769px)` block.
  [styles.css:1052](styles.css)

## Decisions (locked via grill)

1. **What fills the new width:** a right-anchored second element on each row
   (not a bare width bump, not bigger type, not a 2-column grid).
2. **Right element = the Manifest `meta` line** ("type · location"), the same
   canonical line shown under the heading on a project's own page.
3. **Width = a wider capped column**, not full-bleed.
4. **Cap = 1100px**, applied only at `min-width: 769px`. Mobile/tablet keep the
   existing 760px and are visually untouched. The meta line is **desktop-only**.
5. **Docs = CONTEXT.md update only, no new ADR.** This refines ADR 0007 (keeps
   its unified centred column, single scroll, and pointer-only grayscale
   reveal) without reversing it; a full ADR isn't earned. CONTEXT.md must change
   because the index is no longer "title-only" on desktop.

## Implementation

### 1. Add the meta to each row — `index-render.js`

In the row template, render a `.index__meta` span after `.index__title`, from
`p.meta`. Escape it like the other fields. Render it **at all widths** in the
markup; CSS hides it below the desktop breakpoint (keeps the renderer simple and
the static markup uniform).

```
'<span class="index__title" data-title="…">' + esc(title) + '</span>' +
'<span class="index__meta">' + esc(p.meta || '') + '</span>' +
```

### 2. Widen + lay out the row — `styles.css`

- In `@media (min-width: 769px)`, raise the list cap:
  `.index__list { max-width: 1100px; }`. Leave the base (mobile) `760px` rule
  untouched.
- Right-anchor the meta. `.index__title` is already `flex: 1 1 auto`, so it
  expands and pushes a `flex: 0 0 auto` meta to the right edge. Style
  `.index__meta`:
  - small, uppercase-tracked, dim/`--gold-dim`-style secondary tone to sit
    quietly opposite the big display title;
  - `flex: 0 0 auto`, `text-align: right`, top-aligned with the title's first
    line (row is already `align-items: flex-start`);
  - a sensible `max-width`/`white-space` so a long meta truncates or wraps
    gracefully instead of crushing the title.
- **Hide the meta below desktop:** base rule `.index__meta { display: none; }`,
  switched to `display: block`/`flex` inside `@media (min-width: 769px)`. This
  guarantees mobile is pixel-identical to today.

### 3. Update the glossary — `CONTEXT.md`

Amend the **Projects index** entry (and/or the **Inline thumbnail** vocabulary)
to state that on desktop each row also shows a right-anchored **meta** line
("type · location"), while narrow screens remain title + inline thumbnail only.
Note it as a refinement of ADR 0007, not a reversal. No new ADR file.

## Scenarios / edge cases to honour

- **Long meta** (e.g. `"Photowalk · Sassoon Docks, Mumbai"`, id 03) must not
  shove the title or wrap into an ugly stack — cap its width / allow tidy wrap.
- **Long title that wraps 2–3 lines** at the wide cap: meta stays anchored to
  the first line (top-aligned), matching the thumbnail's contact-sheet anchor.
- **Ultra-wide monitors:** the 1100px cap is the guardrail against title and
  meta drifting to opposite far edges with a dead gap between (the ADR 0007
  "stranded" failure mode).
- **Reduced motion / hover:** unchanged — no new motion or hover affordance is
  introduced; the grayscale→colour thumbnail reveal stays the only hover.

## Out of scope

- No 2-column row grid, no full-bleed, no bigger title type.
- No change to mobile/tablet layout, the Void, the Mosaic, or the Listing.
- No new ADR.

## Verification

- Desktop (≥769px): list fills to ~1100px, each row reads title-left /
  meta-right, bottom rules frame content end-to-end. Check ids 03 and 12 for
  long meta / short title.
- Narrow (<769px): identical to current — no meta, 760px column, no layout
  shift.
- Confirm rows still render from the Manifest (no hand-authored `<li>`s) and the
  thumbnail grayscale→colour hover still works on pointer devices.
