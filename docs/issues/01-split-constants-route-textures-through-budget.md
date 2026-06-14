# Split constants and route mobile textures through a budget-sized sample

> Type: AFK
> Triage: ready-for-agent
> Slice 1 of 3 (+ 1 optional)

## Parent

[void-mobile-density-prd.md](../void-mobile-density-prd.md)

## What to build

Decouple "how many **frames** the mobile **field** draws" from "how many
distinct reel images the phone loads", without changing what the visitor sees.

Today the mobile branch ties these two together: one frame = one
evenly-sampled reel index, and the loader fetches exactly the distinct textures
the field references. This slice introduces a second knob alongside the
existing one and routes the mobile texture assignment through it:

- `MOBILE_SLOTS` — frames drawn on mobile. **Keep at 30 in this slice** so the
  visible field is unchanged.
- `MOBILE_TEX_BUDGET` — distinct reel images loaded on mobile. Set to **30** so
  the load footprint is also unchanged.
- A `MOBILE_TEX_BUDGET`-length `sample[]` of reel indices, evenly spread across
  the full 99-image reel.
- Mobile frame texture assignment: each frame takes its texture from `sample`
  indexed by `i % MOBILE_TEX_BUDGET`. Desktop assignment stays exactly as it is.

`collectNeeded()` keeps deriving the load set from the distinct
`layouts[].tex` values — no change to the loader. With both numbers at 30 in
this slice, the field, `TO_LOAD`, and desktop are all visibly identical to
today; what changes is that the two knobs are now independent for the next
slice to use.

## Acceptance criteria

- [ ] `MOBILE_SLOTS` and `MOBILE_TEX_BUDGET` exist as two distinct, separately
      named constants in the mobile-config section.
- [ ] An evenly-spread `sample[]` of `MOBILE_TEX_BUDGET` reel indices is built
      once and used to assign mobile frame textures.
- [ ] Mobile frames take their texture from the sample (`i % MOBILE_TEX_BUDGET`
      lookup), not directly from `i * REEL_COUNT / SLOTS`.
- [ ] Mobile `TO_LOAD` reports ~30 (today's footprint).
- [ ] Mobile field looks the same as before this slice (same frame count, same
      visual density).
- [ ] Desktop path is byte-for-byte unchanged: 101 frames, full 99-image reel
      loaded in order, no visual or behavioural diff.
- [ ] No new terms added to [CONTEXT.md](../../CONTEXT.md). "Texture budget"
      stays an implementation detail.

## Blocked by

None — can start immediately.
