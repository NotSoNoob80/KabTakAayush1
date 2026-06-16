# 0010 — The Reach is an additive input source that writes into `camTarget`

- Status: Accepted
- Date: 2026-06-16

## Context

The Void's homepage already accepts three motion inputs — mouse wheel, desktop
drag, and the mobile pan/fly touch model — and they all share one architectural
seam: each one only ever mutates `camTarget.{x,y,z}`. The render loop reads
`camTarget`, eases the actual camera toward it (`LERP_CAM`), and layers drag
inertia, fly momentum, the Focus tween, and idle sway on top. No input directly
moves the camera, sets velocities the others don't share, or owns a render-loop
branch of its own.

[The Reach](../prd/the-reach.md) adds a fourth input source: an opt-in,
on-device hand-tracking layer in which an open palm becomes a joystick and a
pinch-grab becomes **Focus**. It is the most surprising input source on this
site by some distance — a portfolio asking for a camera permission, lazy-loading
a WASM hand model, and running per-frame inference is not a normal portfolio
behaviour, and the choice deserves a written rationale.

The temptation when adding an input *this* unusual is to give it its own seam:
a dedicated render-loop branch, a separate camera state, a switch that
"hand-tracking mode" toggles. That would be a category error. The whole
expressive trick of The Reach is that a mouse drag and a hand wave should
**compose** — feel like one camera, not two modes the visitor has to pick
between. The existing `camTarget` seam already gives that for free, as long as
The Reach respects it.

## Decision

The Reach is **one more writer to `camTarget`**, not a parallel control path.

Every frame, before the existing camera chase runs:

- Pan: the palm's offset from the **rest zone**, dead-zone subtracted and
  scaled by `REACH_PAN`, is added to `camTarget.x` / `camTarget.y` with the
  sign chosen to match the existing drag direction.
- Depth: the apparent hand-size delta from the per-visitor calibrated neutral,
  scaled by `REACH_FLY`, is added to `camTarget.z` — bigger hand ⇒ `z`
  decreases ⇒ fly forward, matching wheel and touch sign.
- Focus: a pinch-grab calls the existing `setFocus(raycastFrames(W/2, H/2))`
  / `releaseFocus()` — the same functions the desktop click and the mobile tap
  already call. The only difference is the screen coordinates passed in.
- While `focused` is non-null, The Reach contributes zero, exactly like the
  existing inertia guards (`if (!focused) …`). Focus owns the camera; The
  Reach defers.

Mapping is **rate, not absolute**: hand offset = velocity, applied each frame,
so returning to the rest zone coasts to a stop on the Void's existing inertia.
Absolute 1:1 mapping was rejected up front — the field is effectively infinite
and an absolute hand-to-camera mapping would run the hand out of camera frame
immediately.

The detection loop runs at its own throttled rate (`REACH_DETECTION_HZ` —
30 Hz desktop, 18 Hz mobile, on its own `setTimeout`), writing into a smoothed
hand-state object. The render loop only ever **reads** that smoothed state —
it never blocks on inference. The two loops are intentionally decoupled.

## Consequences

- The Reach inherits the chase loop, `panVX/panVY` drag inertia, `zVel` fly
  momentum, the Focus tween, the dim-others-while-focused fade, and the idle
  mouse sway for free. None of those code paths had to be touched to make hand
  steering feel like it belongs.
- A mouse drag and a hand wave **compose without arbitration** because they
  both `+=` into the same channels. There is no "which input is in charge"
  state machine, and there does not need to be — that was the whole point of
  preserving the seam.
- The Reach inherits Focus's camera ownership without a new guard: the same
  `if (!focused) …` check that already silences wheel pan and drag inertia
  also silences hand pan and depth.
- `REACH_*` tunables sit in the same constants block as `PAN_SPEED`,
  `SCROLL_SPEED`, `TOUCH_PAN_X`, `TOUCH_FLY`, `FOCUS_DIST`, and the friction
  pair. One tunable surface, not scattered.
- The camera lifecycle (`getUserMedia`, model load, detection loop, track
  stop) is fully contained in The Reach's own block, gated behind the CTA.
  The default visitor — anyone who never presses the CTA — pays zero cost:
  no permission prompt, no model download, no WASM, no detection loop. The
  byte-for-byte equivalence of the default path is what this ADR is
  protecting on the *outside* of `camTarget`; the `camTarget` seam is what
  it's protecting on the *inside*.
- A future input source (foot pedals, MIDI knob, eye tracking, head pose…)
  should follow the same rule: write into `camTarget`, respect the
  `focused` guard, contribute deltas not absolutes. If that rule ever feels
  wrong for a new input, the right move is to re-open this ADR, not to
  carve a parallel path next to it.
