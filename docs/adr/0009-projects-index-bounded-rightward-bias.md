# 0009 — Projects index column carries a bounded, responsive rightward bias

- Status: Accepted
- Date: 2026-06-16
- Refines: [ADR 0007](0007-projects-index-unified-inline-thumbnail-list.md),
  [ADR 0008](0008-projects-index-row-is-the-preview.md)

## Context

[ADR 0007](0007-projects-index-unified-inline-thumbnail-list.md) committed the
Projects index to a **centred max-width column** at every width, and
[ADR 0008](0008-projects-index-row-is-the-preview.md) re-affirmed it: *"Restore
the one centred-column layout at every width."* The 1100px cap was the guardrail
against 0007's *"stranded"* failure mode on wide screens.

We then made the **inline thumbnail responsive** — one continuous
`clamp(88px, 12vw, 200px)` instead of the old fixed 72/104px — so the image
fills more of each row and grows with the viewport (≈88px on a phone up to
≈200px on a wide monitor).

The larger thumbnail makes the **left of each row visibly heavier**: a big image
plus the frame number all sit hard against the column's left edge, while the
title and right-anchored meta carry the rest. A *perfectly* centred column then
reads as left-loaded on a wide screen. The request was to "shift the list a bit
to the right to keep the balance," responsively — which is in direct tension
with the literal "centred at every width" wording of 0007/0008.

## Decision

Keep the single centred column and its 1100px cap, but give it a **bounded,
responsive rightward bias** so the enlarged thumbnail sits in roomier space and
the row stops reading as left-loaded.

The bias is applied as **extra left padding only** on `.index`, driven by a
single token:

```css
--nudge: clamp(0px, 7vw - 28px, 120px);
padding-left: calc(20px + var(--nudge));   /* 14px base on phones */
```

- **Padding, not transform or negative margin** — so the column can *never*
  overflow or clip, at any width. The list stays a plain centred block within a
  content box whose left edge has been pushed in.
- **~0 on phones, growing with the viewport, capped at 120px** — the shift is
  imperceptible where space is tight and only becomes a deliberate gesture on
  wide screens (measured: 0px at 375px, ~35px at 1440px, ~52px at 1920px off
  dead-centre; right margin always stays positive — 14px / 127px / 350px).

This **refines, not reverses** 0007/0008: the single column, the single page
scroll, the 1100px stranding guardrail, and "the row is the preview" are all
preserved. Only the centring itself gains a measured bias.

## Consequences

- The index is no longer *symmetrically* centred on wide screens. A future
  reader comparing the code to 0007/0008's "centred at every width" wording
  will find this ADR is the reconciliation: the bias is intentional and bounded.
- Because the bias is padding-based and clamped, no viewport can push the column
  off-screen — the failure mode the transform/negative-margin alternatives risk.
- The responsive thumbnail (`clamp(88px, 12vw, 200px)`, 4:5 via `aspect-ratio`)
  replaces the old phone/desktop fixed-size pair; there is no longer a
  desktop-only thumbnail size override.
- **The hover enlarge from [ADR 0008](0008-projects-index-row-is-the-preview.md)
  is dropped.** That `~1.18×` in-place scale (grown from the thumbnail's
  top-left) was sized for the old 104px thumbnail; against the new responsive
  thumbnail an 18% grow is ~36px — wider than the row's gap — so it spilled over
  the title and ~45px down into the next row. The grayscale→colour bloom (plus
  the title/number gold tint) is now the only hover affordance on the row, so
  nothing ever leaves its row bounds. This supersedes the *enlarge* in 0008;
  "the row IS the preview" and the colour bloom it specified are untouched. The
  `position:relative; z-index` lift that existed only to keep the enlarged
  thumbnail from being clipped is removed with it.
- If the bias is ever unwanted, it reverts by setting `--nudge: 0px` — cheap to
  undo, which is why this is a refinement ADR rather than a new hard constraint.
