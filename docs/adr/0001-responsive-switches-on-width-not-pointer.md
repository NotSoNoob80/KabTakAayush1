# 0001 — Responsive layout switches on width OR pointer, not pointer alone

- Status: Accepted
- Date: 2026-06-14

## Context

The site has two layout families that diverge by device: a hover-rich
desktop layout (the Projects index **preview pane**, the footer wordmark's
per-letter hover) and a compact layout (the index's **inline thumbnails**, a
static footer wordmark).

Originally the switch was keyed purely on pointer capability —
`@media (hover: none), (pointer: coarse)` in CSS, mirrored by
`matchMedia('(hover: none)') || matchMedia('(pointer: coarse)')` in JS.

That semantically means "this device can't hover," which sounds right. But it
fails three real cases that all have a **fine** pointer at a **small** size:

- a narrow desktop window,
- a touch-laptop that reports a fine pointer,
- every device emulator / responsive-preview tool.

All three fell through to a width-based reflow that *kept* the hover-only
preview pane — which cannot work without hover — producing a broken page.

## Decision

The compact layout triggers on **either** an unusable hover **or** a narrow
viewport:

```
@media (hover: none), (pointer: coarse), (max-width: 768px) { … }
```

The JS flag that drives the matching markup uses the identical condition, so
CSS and JS never disagree about which layout is live. The Void homepage
already followed this pattern (`(pointer: coarse) OR innerWidth < 768`); this
brings the rest of the site in line.

## Consequences

- A small screen always gets the compact layout, regardless of pointer.
- A *wide* touchscreen (e.g. a large tablet in landscape, ≥769px) still gets
  the desktop layout. We accept this: hover-equivalent tap affordances exist,
  and a wide screen has room for the richer layout. `(pointer: coarse)`
  remains in the query specifically so wide touch devices that genuinely
  can't hover still fall to the compact layout.
- **CSS and JS must change together.** The condition is duplicated by
  necessity (one in `styles.css`, one in `script.js`); a future edit to one
  must update the other.
- Because the compact CSS block sits *before* the base `.index*` rules in the
  file, its selectors are parent-qualified (`.index .index__…`) to win the
  cascade by specificity rather than source order.
