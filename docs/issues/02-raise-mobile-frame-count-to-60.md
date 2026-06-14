# Raise the mobile frame count to the starter value of 60

> Type: AFK
> Triage: ready-for-agent
> Slice 2 of 3 (+ 1 optional)

## Parent

[void-mobile-density-prd.md](../void-mobile-density-prd.md)

## What to build

Make the mobile **field** noticeably denser by raising `MOBILE_SLOTS` from 30
to **60** — the plan's proposed starting point in the 50–70 band — while
holding the texture footprint flat.

This slice depends on the previous one having decoupled frame count from
texture budget. With that decoupling in place, raising `MOBILE_SLOTS` adds
geometry and draw calls but does *not* add to the loaded reel set: the extra
frames reuse the same `MOBILE_TEX_BUDGET` (~30) textures, indexed via
`i % MOBILE_TEX_BUDGET` from the existing `sample[]`. Because frames are
stratified one-per-Z-band by `i`, frame `i` and its duplicate
`i + MOBILE_TEX_BUDGET` sit ~30 depth bands apart, so duplicates land far apart
in the field rather than next to each other.

The exact final number is intentionally left for the next (HITL) slice to
choose by eye against desktop. This slice ships 60 as the in-band default so
the denser field is mergeable on its own.

## Acceptance criteria

- [ ] `MOBILE_SLOTS = 60`.
- [ ] The mobile field is visibly denser than before — closer to the desktop
      feel — confirmed by side-by-side comparison in a narrow viewport.
- [ ] Mobile `TO_LOAD` still reports ~30 (texture footprint flat).
- [ ] No new constants beyond the ones introduced in the previous slice.
- [ ] Desktop path remains byte-for-byte unchanged.
- [ ] No new terms added to [CONTEXT.md](../../CONTEXT.md).

## Blocked by

- Slice 1: [Split constants and route mobile textures through a budget-sized sample](01-split-constants-route-textures-through-budget.md)
