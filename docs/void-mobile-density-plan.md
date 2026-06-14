# Plan — A fuller Void field on mobile (frame count up, memory flat)

## Goal

On phones the **Void** (`index.html`) renders only `MOBILE_SLOTS = 30`
**frames** in its **field**, against `101` on desktop. The phone field reads
as too empty. We want it to *feel* as full as desktop while respecting the
reason the mobile cap exists (GPU / texture memory on phones).

This plan uses the canonical vocabulary in [CONTEXT.md](../CONTEXT.md):
**frame** = one floating photo, **field** = the whole set, **the Void** =
the homepage experience. (Not "cluster.")

## Decisions driving this plan

| # | Decision | Choice |
|---|----------|--------|
| Target | How "same feel" is met | Denser-but-still-lighter middle: bump mobile frame count into the **≈50–70** range, exact value chosen by eye against desktop. |
| Guardrail | What stops us going too far | Tune frame count for density, but **decouple textures from frame count** so memory stays flat, with **frame rate as the hard stop**. |
| Texture budget | How many distinct reel images load on mobile | **Hold ≈30** (today's footprint). The extra frames *reuse* those textures (~2× each). |
| Repetition | Avoid obvious duplicates | The ~30 textures still sample **evenly across the 99-image reel**, and reused textures must be **spread so duplicates are never neighbours** in space/depth. |
| Verification | How we land the number & prove the guardrail | **Both**: DevTools device emulation + CPU/GPU throttle to dial in the count cheaply; **one real mid-range-phone pass** to confirm the fps floor before shipping. |

## Why this is not just "raise the number"

Two things scale with the mobile frame count today, because texture loading is
tied to it:

1. **Frames drawn** — more geometry / draw calls as `SLOTS` grows.
2. **Textures downloaded + GPU memory** — `collectNeeded()`
   ([index.html:428](../index.html)) loads exactly the *distinct* textures the
   field references. Because mobile assigns one evenly-sampled reel index per
   frame ([index.html:385](../index.html)), more frames ⇒ more distinct
   textures ⇒ climbing toward the full 99 downscaled images.

Simply deleting the cap would double-or-worse the phone's texture download and
memory. So the plan **separates two numbers that are currently one**:

- **frame count** (how full the field looks) → raise to ≈50–70
- **texture budget** (how much we download / hold in GPU memory) → hold ≈30

## Implementation sketch

All changes stay inside the existing `IS_MOBILE` branches. **The desktop path
must remain byte-for-byte identical** (it already loads the full 99-image reel
in order via the `!IS_MOBILE` branch of `collectNeeded()`).

1. **Split the two constants** near [index.html:289](../index.html):
   ```js
   var MOBILE_SLOTS    = 60;   // frames drawn on mobile (tune 50–70 by eye)
   var MOBILE_TEX_BUDGET = 30;  // distinct reel images loaded on mobile (hold flat)
   ```

2. **Build a fixed sample of texture indices** spread across the reel, e.g.
   `sample[k] = Math.floor(k * REEL_COUNT / MOBILE_TEX_BUDGET)` for
   `k = 0..MOBILE_TEX_BUDGET-1`. This preserves the "even spread across the
   whole reel" variety that [index.html:385](../index.html) gives today.

3. **Assign each frame a texture from that sample** in the layout loop
   ([index.html:385](../index.html)):
   ```js
   tex: IS_MOBILE ? sample[i % MOBILE_TEX_BUDGET] : i % REEL_COUNT
   ```
   Because frames are **stratified one-per-Z-band** by index `i`
   ([index.html:368](../index.html)), frame `i` and its duplicate `i + 30`
   sit ~30 depth bands apart — duplicates are never neighbours. (Verify this
   holds; if any pairing reads as an obvious repeat, offset or shuffle the
   `sample` lookup.)

4. **No change needed to `collectNeeded()` / `TO_LOAD`** — it derives the load
   set from `layouts[].tex`, so the texture budget falls out automatically:
   `TO_LOAD` becomes ≈30, not ≈60.

5. **Leave untouched on mobile**: `MAX_TEX = 1024` downscaling, antialias off,
   touch tuning. These already protect the phone and are orthogonal to density.

## Verification

1. **Emulation pass** (cheap iteration): narrow phone viewport + CPU/GPU
   throttle. Step the frame count through 50 / 60 / 70 and compare on-screen
   density to a desktop window side by side. Confirm `TO_LOAD` still shows ~30.
2. **Real-device pass** (the guardrail): load the served page on a mid-range
   phone, fly through the field, watch for jank / dropped frames. If the chosen
   count can't hold a smooth flythrough, step it down — **fps wins over
   density**.
3. Confirm **desktop is unchanged**: still 101 frames, still loads all 99
   textures in order, no visual or behavioural diff.

## Out of scope / notes

- The loader UI hardcodes `0 / 59` at [index.html:244](../index.html); the real
  total is computed at runtime (`TO_LOAD`), so this is a stale display string,
  not a functional bug. Not touched by this plan. (Worth a one-line fix later so
  the loader doesn't briefly lie.)
- No new glossary terms — "frame count" and "field" already exist in
  [CONTEXT.md](../CONTEXT.md). "Texture budget" is an implementation detail and
  stays out of the glossary.
