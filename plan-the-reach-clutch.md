# Plan — The Reach: depth-clutch controls

## Goal

Give a visitor steering the Void with their hand a way to **commit a depth**
and pan around at it without the depth channel reacting to every twitch. Today,
any visible hand drives `camTarget.{x, y, z}` simultaneously, and depth — driven
by *apparent hand size* — is the noisiest of the three. The fix is a third
gesture state, **the clutch**, that pins `z` while leaving pan live.

Same architecture as [ADR 0010](docs/adr/0010-the-reach-additive-camtarget-writer.md):
The Reach is still one additive writer to `camTarget` — the clutch only changes
*when* it writes to `z`, not where it writes.

## Naming (proposed glossary additions)

This change extends the existing Reach vocabulary
(**The Reach**, **the reticle**, **pinch-grab**, **rest zone**) with:

- **The clutch** — the closed-fist gesture: thumb folded across curled fingers
  2–5. The gesture counterpart to "grab and hold the depth".
- **Depth-clutched** — the state the Void is in while the clutch is held:
  `camTarget.z` does not integrate new hand input; pan continues to write
  `camTarget.x / y` normally.
- **The clutch ring** — a thin concentric outer ring around **the reticle**,
  shown *only while depth-clutched*, that reads as "pinned". Composes with
  the existing `is-pushing` brightening of the reticle centre.

The clutch is **a distinct gesture from pinch-grab**, not a generalisation
of it. A pinch-grab requires thumb + index touching *with fingers 3–5
extended*; a clutch requires *all four* fingers 2–5 curled. The two states
are physically and computationally separable.

> These are **not yet written into `CONTEXT.md`** — this is "just a plan file
> for now" per the request. When the clutch ships, add the three terms above
> to `CONTEXT.md` under *Behavioural vocabulary* / *Things on the screen*. A
> small ADR is warranted at build time for the *per-transition re-anchor* of
> `calib.size` (see Decision 4 below) — that is the one real architectural
> shift inside The Reach.

## Decisions (locked via grill)

1. **Three-state gesture vocabulary, not two.** Open palm, the clutch, and
   pinch-grab are three distinct gestures, not "open vs closed". A fist is
   *not* a pinch-grab. The discriminator is the openness of fingers 3, 4, 5:
   pinch-grab keeps them extended, the clutch curls them. Anything that
   matches neither state cleanly is treated as **ambiguous** and contributes
   no new state transition (the previous state holds).
2. **The clutch locks depth (`z`) only.** Pan x/y continues to integrate
   from hand-offset-vs-rest-zone exactly as today. The visitor's motivation
   is "commit my depth and look around at it", not "pause everything".
   Existing `zVel` from prior fly momentum is allowed to **coast to rest on
   `FLY_FRICTION`** — it is not hard-snapped to zero. The clutch stops new
   input from being *added* to `z`; it does not freeze the chase loop.
3. **Pinch-grab → Focus is unchanged.** The same `setFocus(raycastFrames(
   W/2, H/2))` / `releaseFocus()` calls fire on the same pinch hysteresis.
   While `focused`, the entire Reach contributes zero (today's guard
   already covers this) — the clutch state machine resets to "open" on
   Focus entry so that on Focus release the clutch ring is not stale.
4. **On every clutch → open transition, `calib.size` re-anchors to the
   current hand size.** This is the one load-bearing decision and the one
   that warrants an ADR at build. *Why:* the visitor's hand was a closed
   fist a frame ago, so by definition its apparent size is *smaller* than
   the open-palm `calib.size` set during the initial calibration. Without
   re-anchoring, the first frame after opening the clutch reads as "hand is
   way bigger than neutral" and jerks the camera forward. *How:* the first
   detection sample after the state transitions back to "open" replaces
   `calib.size` with that sample's `size`. `calib.x / y / curl` are left
   alone. This is consistent with ADR 0010's "rate, not absolute" mapping
   — the absolute depth reference was already allowed to drift; the clutch
   makes that drift legible to the visitor.
5. **Per-visitor curl thresholds, not universal constants.** During the
   existing 12-sample calibration window, also record the mean curl signal
   and store it as `calib.curl`. Openness thresholds are defined as ratios
   of `calib.curl` (e.g., `OPEN_HI = 0.85`, `FIST_LO = 0.55`), not as
   absolute numbers. Hands vary enough — finger length, age, angle to camera
   — that universal thresholds mis-classify real visitors silently. The
   wall-clock cost of calibration is unchanged.
6. **State persists across short tracking loss (≤ `REACH_LOSS_HINT_MS`,
   currently 2000 ms).** A sneeze, a flicker, a frame the model missed —
   none of them should release a clutch. Beyond the existing
   "show your hand" hint threshold, the clutch auto-releases, and the next
   re-detection re-anchors **all of** `calib.{x, y, size, curl}` (the
   visitor has probably repositioned). This re-uses the existing loss-hint
   timer rather than introducing a second threshold.
7. **The clutch ring is visual feedback for the locked state.** Concentric
   outer ring at ~1.4× the reticle radius, the same gold as the reticle,
   fades in over ~120 ms on engage and out on release. Composes with
   `is-pushing` — the centre dot keeps tracking pan offset while the ring
   is held, which is exactly the mental model. No text label
   ("Depth locked"), no colour shift on the reticle itself — the PRD's
   spareness ("reticle + camera-active indicator are the only feedback
   channels") is preserved.
8. **Mobile gets the clutch too.** No mobile-only fallback UI. Matches the
   PRD's existing posture that mobile Reach is "accepted ergonomic limits,
   not a different UI". We note in the plan, not in the product, that the
   clutch is *more* awkward one-handed than the existing open-palm steer.

## Detection signal — openness

The curl signal added to `reachDetect()` is:

```
curl = mean over fingers 2..5 of |tip - mcp| / hand_size
```

where `hand_size` is the existing wrist→middle-MCP distance already computed
for the depth channel, and the tip/MCP landmark indices for each finger are
the standard MediaPipe ones (index: 8/5, middle: 12/9, ring: 16/13,
pinky: 20/17). Output is roughly in `[0, 1]`: extended → ~1, curled → ~0.

`curl` is smoothed against its previous value with the same `REACH_SMOOTH =
0.35` lerp already used for `x / y / size / pinch` — one smoothing constant
across the whole hand state.

## State machine

Three named states: `open`, `clutched`, `pinching`. Transitions are gated by
hysteresis bands **and** an intention-dwell of `REACH_CLUTCH_DWELL_MS`
(~120 ms ≈ 4 frames at 30 Hz):

- `open → clutched` when `curl < FIST_LO * calib.curl` *and* `pinchDist >
  REACH_PINCH_OFF` *and* the condition has held continuously for the dwell.
- `clutched → open` when `curl > OPEN_HI * calib.curl`, held for the dwell.
  This transition triggers the `calib.size` re-anchor (Decision 4).
- `open → pinching` is the existing pinch-on transition (unchanged):
  `pinchDist < REACH_PINCH_ON`. Setting `pinching = true` also force-sets
  the clutch state to `open` for display purposes (Decision 3).
- `pinching → open` is the existing pinch-off transition (unchanged).
- Any frame in which the gesture matches none of the named states cleanly
  is `ambiguous`: the previous state holds, no transition is taken, no
  `calib.size` re-anchor fires.
- During the 12-sample calibration window, the state machine is held in
  `open` regardless of curl — `calib.curl` is not yet known.

## Effect on `camTarget` per frame

Modifying `reachApplyToTarget()`:

- If `focused`: contribute nothing, as today. Clutch state has already been
  forced to `open` by the pinch handler.
- If `state === 'clutched'`:
    - Apply the **pan** contribution exactly as today (the `r >
      REACH_REST_ZONE` block).
    - Skip the **depth** contribution (`camTarget.z -= ds * REACH_FLY`).
    - Toggle `is-pushing` on the reticle as today (pan can still push).
    - Add `is-clutched` to the reticle for the clutch ring.
- If `state === 'open'`: contribute pan **and** depth as today. Remove
  `is-clutched`.
- The existing chase loop, `panVX / panVY` inertia, `zVel` fly momentum,
  Focus tween, and idle sway are all untouched.

## Reticle — the clutch ring

A new CSS class `.reach-reticle.is-clutched` adds a `box-shadow` outer ring
(or a `::after` pseudo-element ring — TBD at build) of width ~1.5 px at
~1.4× the reticle's radius, in the existing reticle gold, with a 120 ms
opacity transition. Composes additively with `.is-pushing` and
`.is-pinching`. The ring is visible *only* while The Reach is on AND the
state is `clutched`.

## New tunables — `REACH_CLUTCH_*`

Added to the existing `REACH_*` block in `index.html`:

- `REACH_CURL_OPEN_RATIO = 0.85` — openness ratio above which `clutched →
  open` fires.
- `REACH_CURL_FIST_RATIO = 0.55` — openness ratio below which `open →
  clutched` fires.
- `REACH_CLUTCH_DWELL_MS = 120` — intention-dwell on state transitions.
- (Re-uses `REACH_LOSS_HINT_MS` for the auto-release threshold; no new
  constant.)
- (Re-uses `REACH_SMOOTH` for curl smoothing; no new constant.)

This keeps the tunable surface as a single block in one file, as ADR 0010
required.

## Reach-state object additions

`reach` (the existing state object) gains:

- `reach.clutched` — boolean, false at teardown.
- `reach.clutchSince` — timestamp of last entry into the candidate clutch
  state, for the dwell.
- `reach.openSince` — timestamp of last entry into the candidate open
  state, for the dwell.
- `reach.hand.curl` — current smoothed curl signal.
- `reach.calib.curl` — per-visitor open-palm curl mean, captured during
  calibration.

`reachTeardown()` resets `clutched`, `clutchSince`, `openSince`, and clears
`reach.calib.curl`.

## Verification (manual, observable)

In the spirit of the PRD's existing verification matrix — what happens on
the canvas and the camera light, not what happens inside the script:

1. **Open palm flies and pans** exactly as today (regression check).
2. **Closed fist** pins `z` after the dwell — confirmable by holding the
   fist while moving the hand toward/away from the camera and seeing the
   field not advance/retreat. The clutch ring appears around the reticle.
3. **Closed fist + pan** still steers — moving the fist away from the rest
   zone pans normally, but z does not respond.
4. **Open the fist** — z resumes responding from wherever it was, without
   a visible jerk forward or backward.
5. **Pinch-grab** while *not* in a fist still focuses the centred frame
   (regression check).
6. **Pinch-grab during a clutch is not the intended path** — the gesture
   classifier should treat thumb-index-touching-with-other-fingers-curled
   as `ambiguous`, not as a pinch. The clutch holds; no Focus fires.
7. **Closing into a fist while focused** does nothing — Focus owns the
   camera. Releasing Focus leaves the clutch state at `open`, no stale
   clutch ring.
8. **Brief hand loss (<2 s) while clutched** — the clutch ring stays;
   on re-detection of the same fist, nothing surprises the visitor.
9. **Long hand loss (>2 s) while clutched** — the clutch auto-releases,
   the "show your hand" hint appears, the clutch ring fades. On
   re-detection, `calib.{x, y, size, curl}` are re-anchored, the visitor
   resumes from where their open hand now sits.
10. **Mouse + clutch** — a mouse drag continues to write to `camTarget` as
    normal during a clutch (it does not respect the clutch — only The
    Reach's own writer does). Mouse + hand still compose.
11. **Esc / tab-hide** — tears down everything including the clutch state.
12. **Reduced-motion** — The Reach CTA is absent, so the clutch is also
    absent. No additional check needed.

## Out of scope

- A one-time discovery hint ("make a fist to hold depth") — leave
  discoverable through play, matching the rest of the Reach.
- Any mobile-only UI fallback for the clutch.
- Any change to how the *non*-clutch parts of the Reach feel (pan gain,
  fly gain, rest-zone radius, pinch hysteresis). The clutch slots in
  alongside them; it does not retune them.
- Any new input surface that isn't the Reach. The clutch is The Reach's
  internal state, not a global app mode.
- Writing the three new glossary terms into `CONTEXT.md` or cutting the
  re-anchor ADR — deferred to the build, per the convention already
  established by [plan-the-reach.md](plan-the-reach.md).
