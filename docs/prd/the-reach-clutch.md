# PRD — The Reach: the clutch (depth-clutched steering)

## Problem Statement

A visitor has enabled [The Reach](the-reach.md) and is steering the Void with
their hand. They find a depth they like — a corridor through the **frames**
they want to look around inside — and now they want to *commit* to that depth
and pan around at it. Today they cannot. Every visible hand drives all three
`camTarget` channels at once, and depth is the noisiest of the three because
it is derived from the *apparent size* of the hand, which jitters with every
small movement of the wrist, every shift in distance to the front camera,
every change in finger spread.

The result is that "look around at this depth" is not an expressible thought.
Holding the hand still enough to pan without sliding forward or backward is
not realistic ergonomics for a portfolio visitor — they are not a VR rig
operator. The visitor either accepts that depth will twitch under them, or
they retreat to the mouse for the precise bit. Neither is the experience The
Reach is offering.

There is no story problem with the *open palm* mapping itself — pan and fly
both work, and removing either would amputate the joystick. The gap is that
The Reach has no gesture for "I am done choosing depth; pan only from here."

## Solution

Add **the clutch** — a third gesture, distinct from the open palm and from
**pinch-grab**, that pins the depth channel while leaving pan live. The
clutch is the closed-fist gesture: thumb folded across curled fingers 2–5.
While the visitor holds the clutch, the Void is **depth-clutched** —
`camTarget.z` does not integrate new hand input, while pan continues to
write `camTarget.x / y` exactly as today. Releasing the clutch (opening the
hand back to a palm) resumes depth steering from wherever it was, without a
jerk forward or backward.

The clutch is fed by a new openness signal added to the existing detection
pipeline, gated by per-visitor curl thresholds captured during the existing
calibration window, and protected by an intention-dwell so a momentary
finger curl does not engage it. Feedback is **the clutch ring** — a thin
concentric outer ring around the existing **reticle**, shown only while
depth-clutched. The ring composes with the reticle's existing `is-pushing`
brightening: the centre dot keeps tracking pan offset while the ring is
held, which is exactly the mental model.

The clutch is The Reach's internal state, not a new global mode. It writes
nothing new — it only changes *when* The Reach writes to `z`. Mouse, wheel,
touch, and Focus are untouched. [ADR 0010](../adr/0010-the-reach-additive-camtarget-writer.md)'s
rule — every motion input is one more writer to `camTarget`, no parallel
control paths — is preserved.

The new canonical vocabulary follows the spirit of The Reach's existing
glossary (**The Reach**, **the reticle**, **pinch-grab**, **rest zone**):
**the clutch** for the gesture, **depth-clutched** for the state it puts the
Void into, **the clutch ring** for the visible feedback.

## User Stories

1. As a visitor steering the Void with my hand, I want a way to commit to a
   depth and pan around at it, so that "look around from here" is something
   I can express without retreating to the mouse.
2. As a visitor steering with my hand, I want closing my hand into a fist to
   pin the depth channel, so that the gesture has the literal meaning of
   "grab and hold the depth."
3. As a visitor holding a fist, I want pan x/y to keep working from my
   hand's offset to the rest zone, so that I can look around at the depth I
   just committed to.
4. As a visitor holding a fist, I want moving my hand toward or away from
   the camera to *not* fly the camera forward or backward, so that the
   commitment is real and small wrist twitches do not leak through.
5. As a visitor who is done clutching, I want opening my hand back to a
   palm to resume depth steering smoothly, so that release does not snap
   the camera forward or backward.
6. As a visitor holding a fist, I want a **clutch ring** to appear around
   the reticle, so that I have unambiguous feedback that depth is pinned —
   without an on-screen camera preview or a text label.
7. As a visitor whose hand is briefly lost to the tracker (a flicker, a
   missed frame, a sneeze), I want my clutch to *survive* that loss for the
   same ~2 second window the existing "show your hand" hint waits on, so
   that the gesture is forgiving rather than punishing.
8. As a visitor whose hand has been gone for longer than that hint window,
   I want the clutch to auto-release and the Void to fall back to its
   existing loss behaviour, so that re-detection does not surprise me with
   a stale pinned-depth state.
9. As a visitor whose hand momentarily flexed but did not actually commit,
   I want an **intention-dwell** before the clutch engages, so that a stray
   curl during a normal steer does not pin the camera under me.
10. As a visitor with non-average finger length, hand angle to the camera,
    or age-related range of motion, I want the openness thresholds to be
    calibrated to *my* hand (the same calibration window that already
    captures my centre and neutral size), so that "open" and "fist" are
    judged against my own neutral rather than a universal constant.
11. As a visitor who pinch-grabs to **Focus** a frame while not in a fist,
    I want the existing pinch-grab → Focus behaviour to work exactly as
    today, so that the clutch does not interfere with the Reach's primary
    selection gesture.
12. As a visitor who has Focused a frame, I want a fist to do nothing while
    Focus owns the camera, so that the existing "Focus silences The Reach"
    guard is preserved.
13. As a visitor who releases Focus, I want the clutch state to be cleared
    so the clutch ring is not stale on the reticle, even if my hand
    happened to be in a fist at the moment of release.
14. As a visitor whose hand passes through a half-curl, thumb-and-three-
    fingers, or other ambiguous shape, I want my previous state to hold
    rather than chatter between open and clutched, so that the camera
    behaviour matches what I intended a moment ago.
15. As a visitor on a phone using The Reach one-handed, I want the clutch
    to be available with no mobile-only fallback UI, so that the experience
    is not a different product on a different device — even though I
    accept it is more awkward one-handed than the open-palm steer.
16. As a visitor using a mouse drag while clutched, I want the mouse to
    keep writing to `camTarget` as normal — the clutch governs only The
    Reach's own writes — so that the existing "inputs compose, they do
    not arbitrate" feel is preserved.
17. As a visitor whose pre-existing fly momentum had not yet decayed when I
    clutched, I want that momentum to coast to rest on the Void's
    `FLY_FRICTION` rather than being hard-snapped to zero, so that the
    clutch does not introduce a stop the rest of the Void's motion model
    does not have.
18. As a visitor who disables The Reach (CTA toggle, Esc, tab-hide), I want
    all clutch state to be torn down with the rest of the Reach state, so
    that the next enable is a fresh start.
19. As a visitor with `prefers-reduced-motion`, I want the clutch to be
    absent because The Reach itself is absent, so that the existing
    reduced-motion posture is not broken.
20. As a future maintainer reading the codebase, I want **the clutch**,
    **depth-clutched**, and **the clutch ring** added to `CONTEXT.md`
    when the feature ships, alongside the existing Reach vocabulary, so
    that the new gesture is documented where the others are.
21. As a future maintainer, I want an ADR captured for the **per-transition
    re-anchor of `calib.size`** on `clutched → open`, so that the one real
    architectural shift the clutch introduces inside The Reach has a
    written rationale.

## Implementation Decisions

### Three-state gesture vocabulary

The Reach's gesture machine has three named states, not two:

- **open** — palm visible, fingers 2–5 extended.
- **clutched** — fist: fingers 2–5 curled, thumb folded across them.
- **pinching** — thumb + index touching with fingers 3–5 extended (the
  existing pinch-grab gesture, unchanged).

The discriminator between **clutched** and **pinching** is the openness of
fingers 3, 4, 5: pinch-grab keeps them extended, the clutch curls them. A
fist is *not* a pinch. A frame whose gesture matches none of the three
states cleanly is **ambiguous**: the previous state holds, no transition
fires, and no calibration re-anchor (see below) is triggered. This is the
load-bearing rule for keeping the clutch separable from pinch-grab.

### Openness signal — `curl`

A new signal is added to the existing detection pipeline:

```
curl = mean over fingers 2..5 of |tip - mcp| / hand_size
```

— where `hand_size` is the wrist→middle-MCP distance already computed for
the depth channel, and the tip/MCP landmark indices for each finger are the
standard MediaPipe ones. Output is roughly in `[0, 1]`: extended → ~1,
curled → ~0. The signal is smoothed against its previous value with the
existing `REACH_SMOOTH` lerp used for `x / y / size / pinch` — one smoothing
constant across the whole hand state.

### Per-visitor curl thresholds

Universal openness thresholds mis-classify real visitors silently — finger
length, age, and angle to the camera vary too much. During the existing
12-sample calibration window, the mean curl is also recorded and stored as
`calib.curl`. Openness thresholds are then defined as *ratios* of
`calib.curl`, not as absolute numbers. The wall-clock cost of calibration
is unchanged.

### State machine (with hysteresis and intention-dwell)

Transitions are gated by hysteresis bands and by an intention-dwell of
`REACH_CLUTCH_DWELL_MS` (~120 ms, ≈ 4 frames at 30 Hz):

- `open → clutched` when `curl < FIST_LO * calib.curl` *and* `pinchDist >
  REACH_PINCH_OFF` *and* the condition has held continuously for the dwell.
- `clutched → open` when `curl > OPEN_HI * calib.curl`, held for the dwell.
  This transition triggers the `calib.size` re-anchor (below).
- `open → pinching` is the existing pinch-on transition, unchanged. Setting
  `pinching = true` also force-sets the clutch state to `open` so that on
  Focus release the clutch ring is not stale.
- `pinching → open` is the existing pinch-off transition, unchanged.
- During the 12-sample calibration window the state machine is held in
  `open` regardless of curl — `calib.curl` is not yet known.
- Any ambiguous frame: previous state holds.

### The one real architectural decision — re-anchor `calib.size` on
`clutched → open`

On every `clutched → open` transition, the first detection sample after the
state transitions back to `open` replaces `calib.size` with that sample's
`size`. The other calibration fields (`calib.x`, `calib.y`, `calib.curl`)
are left alone.

*Why:* the visitor's hand was a closed fist a frame ago, so by definition
its apparent size is *smaller* than the open-palm `calib.size` captured
during the initial calibration. Without re-anchoring, the first frame after
opening the clutch reads as "hand is way bigger than neutral" and jerks the
camera forward.

This is consistent with [ADR 0010](../adr/0010-the-reach-additive-camtarget-writer.md)'s
"rate, not absolute" mapping — the absolute depth reference was already
allowed to drift; the clutch makes that drift legible to the visitor and
moves it to a deterministic moment. A small ADR is warranted at build for
this decision.

### Effect on `camTarget` per frame

Modifying the existing per-frame Reach writer:

- If `focused`: contribute nothing, as today. Clutch state has already been
  forced to `open` by the pinch handler.
- If state is `clutched`: apply the **pan** contribution exactly as today,
  skip the **depth** contribution, toggle the reticle's `is-pushing` as
  today (pan can still push), and add `is-clutched` to the reticle for the
  clutch ring.
- If state is `open`: contribute pan **and** depth as today, remove
  `is-clutched`.
- The chase loop, `panVX / panVY` inertia, `zVel` fly momentum, Focus
  tween, and idle sway are all untouched. Existing `zVel` from prior fly
  momentum is allowed to coast to rest on `FLY_FRICTION` — it is not
  hard-snapped to zero. The clutch stops new input from being *added* to
  `z`; it does not freeze the chase loop.

### Tracking-loss behaviour

A clutch survives tracking loss up to the existing `REACH_LOSS_HINT_MS`
threshold (currently 2000 ms). Beyond that threshold, the clutch
auto-releases and the next re-detection re-anchors **all of**
`calib.{x, y, size, curl}` (the visitor has probably repositioned). This
re-uses the existing loss-hint timer rather than introducing a second
threshold.

### The clutch ring

A new CSS modifier on the reticle (`is-clutched`) adds a thin concentric
outer ring at ~1.4× the reticle's radius, in the existing reticle gold,
with a ~120 ms opacity transition on engage and release. The ring is
visible only while The Reach is on and the state is `clutched`. It
composes additively with `is-pushing` and `is-pinching` — the centre dot
keeps tracking pan offset while the ring is held.

No text label ("Depth locked"), no colour shift on the reticle's centre,
no on-screen camera preview. The Reach's existing spareness — "the
reticle and the camera-active indicator are the only feedback channels" —
is preserved.

### New tunable constants — `REACH_CLUTCH_*`

Added to the existing `REACH_*` block in the Void's source, keeping the
tunable surface a single block in one file as [ADR 0010](../adr/0010-the-reach-additive-camtarget-writer.md)
requires:

- `REACH_CURL_OPEN_RATIO` — openness ratio above which `clutched → open`
  fires (proposal: 0.85).
- `REACH_CURL_FIST_RATIO` — openness ratio below which `open → clutched`
  fires (proposal: 0.55).
- `REACH_CLUTCH_DWELL_MS` — intention-dwell on state transitions
  (proposal: 120).

`REACH_LOSS_HINT_MS` is re-used for the auto-release threshold (no new
constant). `REACH_SMOOTH` is re-used for curl smoothing (no new constant).

### Reach state object additions

The existing `reach` state object gains: `reach.clutched` (boolean,
false at teardown), `reach.clutchSince` and `reach.openSince` (timestamps
for the dwell), `reach.hand.curl` (current smoothed curl signal), and
`reach.calib.curl` (per-visitor open-palm curl mean, captured during
calibration). Teardown resets all of them.

### Mobile

The clutch is available on mobile with no mobile-only fallback UI, matching
The Reach's existing posture of "accepted ergonomic limits, not a different
UI". One-handed clutch is *more* awkward than open-palm steer; that is
acknowledged in the plan, not exposed in the product.

### Vocabulary and documentation (deferred to build)

When the clutch ships:

- Write **the clutch**, **depth-clutched**, and **the clutch ring** into
  `CONTEXT.md` under *Behavioural vocabulary* and *Things on the screen*,
  alongside the existing Reach vocabulary.
- Cut an ADR for the per-transition `calib.size` re-anchor on
  `clutched → open` — the one real architectural shift inside The Reach.

These are deferred to the build, not the PRD.

## Testing Decisions

A good test for this feature watches what happens on the canvas and at the
camera light, not what happens inside the script. Module-style tests
against the state machine's identity, the curl signal's exact formula, or
the calibration buffer's internals would couple to choices expected to be
tuned during build. The existing PRDs verify against externally observable
behaviour, never JS internals — the clutch follows the same convention.

Verification matrix, run as a manual checklist across desktop webcam and a
real mobile front camera:

1. **Open palm flies and pans** exactly as today — regression check that
   adding the clutch did not change the open-palm steer.
2. **Closed fist pins depth** after the dwell: holding a fist while moving
   the hand toward and away from the camera does not advance or retreat
   the field. The clutch ring appears around the reticle.
3. **Closed fist + pan still steers** — moving the fist away from the rest
   zone pans normally, but `z` does not respond.
4. **Open the fist** — depth resumes responding from wherever it was,
   without a visible jerk forward or backward. (Direct verification of the
   `calib.size` re-anchor decision.)
5. **Pinch-grab while *not* in a fist** still focuses the centred frame —
   regression check on the existing pinch-grab → Focus behaviour.
6. **Pinch-grab during a clutch** is not the intended path: the gesture
   classifier treats thumb-index-touching-with-other-fingers-curled as
   `ambiguous`, not as a pinch. The clutch holds; no Focus fires.
7. **Closing into a fist while focused** does nothing — Focus owns the
   camera. Releasing Focus leaves the clutch state at `open`, no stale
   clutch ring on the reticle.
8. **Brief hand loss (<2 s) while clutched** — the clutch ring stays; on
   re-detection of the same fist, nothing surprises the visitor.
9. **Long hand loss (>2 s) while clutched** — the clutch auto-releases,
   the "show your hand" hint appears, the clutch ring fades. On
   re-detection, `calib.{x, y, size, curl}` are re-anchored, the visitor
   resumes from where their open hand now sits.
10. **Mouse + clutch** — a mouse drag continues to write to `camTarget` as
    normal during a clutch (it does not respect the clutch; only The
    Reach's own writer does). Mouse + hand still compose.
11. **Esc / tab-hide** — tears down all Reach state including the clutch
    state and the clutch ring. A subsequent re-enable is a fresh start.
12. **Reduced-motion** — The Reach CTA is absent, so the clutch is also
    absent. No additional check needed.

Prior art for this style of behavioural verification matrix: the
verification checklists at the end of [the-reach.md](the-reach.md) and the
plan file [plan-the-reach.md](../../plan-the-reach.md) — observable
outcomes on the canvas and at the camera light, not JS internals.

## Out of Scope

- A one-time discovery hint ("make a fist to hold depth") — discoverable
  through play, matching the rest of The Reach.
- Any mobile-only UI fallback for the clutch.
- Any change to how the *non*-clutch parts of The Reach feel: pan gain,
  fly gain, rest-zone radius, pinch hysteresis, calibration sample count.
  The clutch slots in alongside them; it does not retune them.
- Any new input surface that isn't The Reach. The clutch is The Reach's
  internal state, not a global app mode.
- Multi-hand or two-handed gestures — v1 of The Reach is single-hand only
  and this PRD does not change that.
- Application of the clutch to surfaces other than the Void (the
  Projects index, the Mosaic, the Listing). The Reach itself is
  Void-only; the clutch inherits that scope.
- A text label or colour shift on the reticle for the clutched state —
  the clutch ring is the only feedback channel added.
- Writing the new glossary terms into `CONTEXT.md` or cutting the
  `calib.size` re-anchor ADR — deferred to build, per the convention
  established by The Reach.

## Further Notes

- The clutch is load-bearing on [ADR 0010](../adr/0010-the-reach-additive-camtarget-writer.md):
  it does not introduce a parallel control path, a second writer, or a
  mode switch — it only changes *when* The Reach writes to `camTarget.z`.
  The seam is preserved.
- The `calib.size` re-anchor on `clutched → open` is the one real
  architectural shift this PRD introduces inside The Reach, and is why a
  small ADR is warranted at build. Everything else is a refinement of
  existing structure (a new state, a new signal, a new CSS modifier, three
  new tunables in the existing block).
- The PRD intentionally avoids file paths and line numbers; the plan file
  [plan-the-reach-clutch.md](../../plan-the-reach-clutch.md) carries the
  current seams for the implementer to read at the moment of build.
