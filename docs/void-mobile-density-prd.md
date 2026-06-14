# PRD — A fuller Void field on mobile (frame count up, memory flat)

> Status: ready-for-agent
> Source plan: [void-mobile-density-plan.md](void-mobile-density-plan.md)
> Area: The Void (`index.html`). Vocabulary per [CONTEXT.md](../CONTEXT.md).

## Problem Statement

A visitor opening **the Void** (the homepage) on their phone sees a field that
reads as too empty. Where a desktop visitor flies through a dense **field** of
floating photo **frames**, the phone visitor gets a sparse scattering. The Void
is meant to be the site's signature first impression, and on the device most
people actually arrive on, it underdelivers — it feels thin rather than
immersive.

The emptiness is not accidental. The mobile field is intentionally capped
(`MOBILE_SLOTS = 30` **frames**, against `101` on desktop) to protect phones
from running out of GPU / texture memory. So the visitor's problem ("the Void
feels empty on my phone") sits directly against the constraint that created it
("phones can't hold as many textures as desktops"). We need the field to *feel*
as full as desktop without reintroducing the memory pressure the cap exists to
prevent.

## Solution

Make the mobile **field** noticeably denser — bump the mobile **frame** count
from 30 into roughly the **50–70** range, chosen by eye against a desktop window
— while holding the amount of image data the phone downloads and keeps in GPU
memory **flat** at today's footprint (~30 distinct reel images).

The key move is to **separate two numbers that are currently one**. Today, more
frames automatically means more distinct textures, because each frame is given
its own evenly-sampled reel index and the loader fetches exactly the distinct
textures the field references. We decouple them:

- **Frame count** (how full the field looks) → raise to ≈50–70.
- **Texture budget** (how much we download / hold in GPU memory) → hold ≈30.

The extra frames **reuse** the ~30 loaded textures (~2× each), with reuse spread
so a texture and its duplicate are never neighbours in space or depth. **Frame
rate is the hard stop**: if the chosen count can't hold a smooth flythrough on a
real mid-range phone, the count steps down — fps wins over density.

From the visitor's side: the phone Void now feels like the desktop Void, and the
page still loads and flies smoothly on a normal phone. The desktop experience is
completely unchanged.

## User Stories

1. As a phone visitor, I want the Void to feel as full and immersive as it does
   on a desktop, so that my first impression of the site matches what desktop
   visitors get.
2. As a phone visitor, I want the field to read as a dense cloud of frames
   rather than a sparse scattering, so that flying through it feels rich.
3. As a phone visitor, I want the page to still load quickly on mobile data, so
   that the denser field doesn't cost me a longer wait.
4. As a phone visitor on a mid-range device, I want the flythrough to stay
   smooth with no jank or dropped frames, so that the richer field never makes
   the experience feel broken.
5. As a phone visitor, I want the extra frames to show varied photos rather than
   the same few repeated obviously, so that the field still feels like a real
   spread of the work.
6. As a phone visitor, I want any repeated photo to never sit right next to its
   own duplicate, so that I don't notice the reuse.
7. As a phone visitor, I want the loading indicator to reflect what is actually
   being loaded, so that the count it shows is honest about progress.
8. As a desktop visitor, I want the Void to behave exactly as it does today —
   101 frames, all 99 reel images loaded in order — so that nothing I rely on
   visually or behaviourally changes.
9. As the site owner, I want the phone's texture download and GPU memory to stay
   at roughly today's level, so that the denser field doesn't reintroduce the
   memory risk the mobile cap was created to prevent.
10. As the site owner, I want the exact mobile frame count to be tunable by eye,
    so that I can land the "same feel as desktop" judgement without a code
    rewrite each time.
11. As the site owner, I want frame rate to act as a hard guardrail on density,
    so that I never ship a count that sacrifices smoothness for fullness.
12. As the site owner, I want to confirm the density on cheap DevTools emulation
    before testing on hardware, so that I can iterate on the number without a
    device in hand for every step.
13. As the site owner, I want a single real mid-range-phone pass before shipping,
    so that the fps guarantee rests on actual hardware, not emulation.
14. As a developer, I want frame count and texture budget to be two explicit,
    separately-named constants, so that it's obvious they're independent knobs.
15. As a developer, I want the texture-loading set to keep deriving itself
    automatically from what the field references, so that holding the budget
    flat doesn't require a second place to keep in sync.
16. As a developer maintaining the glossary, I want this change to introduce no
    new public vocabulary, so that "texture budget" stays an implementation
    detail and the field/frame terms keep their meaning.
17. As a developer, I want the desktop code path to remain byte-for-byte
    identical, so that I can be confident the change is isolated to the mobile
    branch.

## Implementation Decisions

All changes stay inside the existing `IS_MOBILE` branches in [index.html](../index.html).
The desktop path (`!IS_MOBILE`) must remain byte-for-byte identical — it already
loads the full 99-image reel in order.

- **Split one constant into two.** Where mobile today sets a single
  `MOBILE_SLOTS = 30`, introduce two independent knobs near the mobile-detection
  block:
  - `MOBILE_SLOTS` — frames drawn on mobile. Raise to a tunable value in the
    50–70 range (the plan proposes 60 as a starting point), final value chosen
    by eye against desktop.
  - `MOBILE_TEX_BUDGET` — distinct reel images loaded on mobile. Hold at ~30
    (today's footprint).

- **Build a fixed, evenly-spread sample of texture indices.** Construct a
  `MOBILE_TEX_BUDGET`-length list of reel indices spread across the whole
  99-image reel (e.g. `sample[k] = floor(k * REEL_COUNT / MOBILE_TEX_BUDGET)`).
  This preserves the "even spread across the whole reel" variety the mobile
  branch gives today, but now from a fixed-size budget rather than one index per
  frame.

- **Assign each frame a texture from that sample.** In the layout loop, mobile
  frames take their texture from the sample by `i % MOBILE_TEX_BUDGET` instead of
  the current one-index-per-frame mapping. Desktop continues to use `i % REEL_COUNT`.

- **Rely on stratified depth to keep duplicates apart.** Frames are stratified
  one-per-Z-band by index `i`, so frame `i` and its duplicate `i + MOBILE_TEX_BUDGET`
  sit roughly `MOBILE_TEX_BUDGET` depth bands apart — duplicates are never
  neighbours. This must be verified visually; if any pairing reads as an obvious
  repeat, offset or shuffle the `sample` lookup.

- **No change to the loader's needed-set logic.** `collectNeeded()` derives the
  load set from the distinct `layouts[].tex` values, so holding the budget flat
  falls out automatically: the mobile load total (`TO_LOAD`) becomes ~30, not
  ~60, with no second place to maintain.

- **Leave the existing mobile protections untouched.** `MAX_TEX = 1024`
  downscaling, antialias off, capped pixel ratio, and touch tuning all stay as
  they are. They protect the phone and are orthogonal to density.

- **No new glossary terms.** "Frame count" and "field" already exist in
  [CONTEXT.md](../CONTEXT.md). "Texture budget" is an implementation detail and
  stays out of the glossary.

## Testing Decisions

This repo has no automated test harness (no `package.json`, no runner, no spec
files). The Void's behaviour is WebGL, visual, and performance-bound — the two
things this feature must guarantee (density *feels* right, fps stays smooth) are
inherently human judgement calls and cannot be asserted in a unit test. So the
primary verification is manual, matching how the Void has always been validated.

A good test here checks **external, observable behaviour**, not implementation
details: what the field looks like, what actually gets loaded, and whether the
flythrough stays smooth — never the internal shape of the layout array.

**Manual verification (primary):**

1. **Emulation pass (cheap iteration).** Narrow phone viewport + CPU/GPU
   throttle in DevTools. Step the frame count through 50 / 60 / 70 and compare
   on-screen density to a desktop window side by side. Confirm the loaded total
   (`TO_LOAD`) still shows ~30 regardless of frame count.
2. **Real-device pass (the guardrail).** Load the served page on a real
   mid-range phone, fly through the field, and watch for jank or dropped frames.
   If the chosen count can't hold a smooth flythrough, step it down — fps wins
   over density.
3. **Desktop-unchanged check.** Confirm desktop still renders 101 frames, still
   loads all 99 textures in order, with no visual or behavioural diff.

**Optional pure-function seam (recommended, highest available seam):** the only
part of this feature that *can* be meaningfully unit-tested is the texture
mapping — and it's worth isolating because its invariants are exact, not visual.
If extracted into a pure function that takes `(slots, texBudget, reelCount)` and
returns the per-frame texture assignment, the following invariants can be
asserted without a browser or any THREE.js dependency:

- The set of distinct textures used has size ≤ `texBudget` (memory stays flat).
- Every sampled index falls within `[0, reelCount)` and the sample spreads
  across the full reel (variety preserved).
- No frame shares a texture with an immediate Z-band neighbour (duplicates not
  adjacent).
- With desktop parameters, the assignment is identical to `i % reelCount`
  (desktop path provably unchanged).

There is no prior art for tests in this repo, so this seam would also establish
the first one. It is a recommendation, not a blocker: the visual/fps guarantees
still rest on the manual passes above.

## Out of Scope

- **The stale loader string.** The loader UI hardcodes `0 / 59` at
  [index.html:244](../index.html); the real total is computed at runtime
  (`TO_LOAD`), so this is a cosmetic stale display, not a functional bug. Worth a
  one-line fix later so the loader doesn't briefly lie, but not part of this
  change.
- **Changing the desktop field.** Desktop frame count, reel loading order, and
  the full 99-image download all stay exactly as they are.
- **The mobile protection mechanisms themselves.** `MAX_TEX` downscaling,
  antialias, pixel-ratio cap, and touch tuning are not being retuned here.
- **Introducing a build step or test framework** beyond the optional single
  pure-function seam described above.
- **Adding "texture budget" or other implementation terms to the glossary.**

## Further Notes

- The headline guardrail is **memory flat, fps as the hard stop**. If density
  and smoothness ever conflict on real hardware, smoothness wins and the frame
  count comes down.
- The final frame count is deliberately left as an eyeball decision in the 50–70
  band rather than fixed in this document, because "same feel as desktop" is a
  visual judgement best made against a live side-by-side.
- The duplicate-spacing claim (frame `i` vs `i + MOBILE_TEX_BUDGET` sitting far
  apart in depth) depends on the existing stratified-Z layout holding; it must be
  eyeballed during the emulation pass, with a `sample` offset/shuffle as the
  fallback if any repeat reads as obvious.
