# 0002 — Project pages reveal the mosaic directly, no space-void intro

- Status: Accepted
- Date: 2026-06-14

## Context

Clicking a project title used to play a two-phase "space-void mosaic
intro": the project's photos first appeared as small drifting frames in a
dark, zero-gravity field (Phase 1), with a pulsing **"click anywhere"** cue;
only on that click (or a 3s auto-advance) did the frames converge to their
real grid positions with a rack-focus blur and spring overshoot (Phase 2).

It was a signature flourish, but it put a **gate** between the visitor and
the work they clicked to see — an extra interaction, a few seconds of black
screen, and a borrowed "frames floating in the void" metaphor that properly
belongs to the homepage, not the project page.

## Decision

Remove Phase 1 entirely. Arriving from a project-title click now lands
**directly** in the assembled mosaic with a single clean reveal: each tile
eases into its real grid position from a slight zoom (scale 1.04 → 1) + fade,
staggered centre-outward, after which the page chrome (nav, back button,
eyebrow, title, meta) staggers in. No dark void, no drifting, no blur, no
click gate.

The `kta:from-projects` sessionStorage flag and the `intro-armed` html class
**remain** — they still distinguish "navigated here by clicking a title"
(which gets the staggered reveal) from a direct load / reload (which gets the
grid's plain per-tile load-fade and shows chrome immediately).

## Consequences

- The project page no longer uses the Void's "frame" metaphor; it shows
  **Mosaic tiles** only (see [CONTEXT.md](../../CONTEXT.md)).
- Deleted: the `.intro-cue` element + styles, the `space-drift` /
  `phase2-focus` keyframes and their classes, and the Phase-1/Phase-2 JS.
- The `intro-armed` plumbing looks heavier than the plain reveal it now
  drives — that is deliberate, and this record is why it survives: it is the
  gate that keeps the reveal off direct loads and reloads.
- Faster, lower-friction path to the photos; the brand's "drama" now lives on
  the homepage Void rather than being re-staged on every project open.
