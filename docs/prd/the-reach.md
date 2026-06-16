# PRD — The Reach (steer the Void with your hand)

## Problem Statement

A visitor reaches the Void — the homepage WebGL field of floating **frames** —
and can only fly it with the inputs the surface already exposes: mouse wheel,
desktop drag, mobile pan/fly, and tap/click to **Focus** a frame. The
experience is fine on its own terms, but it is one of *many* portfolios that
behave that way. The site does not, right now, give a curious visitor any way
to *step inside* the Void and steer it with anything more than a finger or a
pointer.

There is no story problem here — the existing inputs are not broken. The gap
is expressive: the Void is a *flight* through a field, and it currently asks
you to fly it with a scroll wheel. A first-time visitor who would otherwise
become "the kind of person who tells their friends about this site" finds the
ceiling of the interaction inside ten seconds.

Two constraints make the gap real rather than aesthetic:

- The Void is the front door. Anything ambitious added to it must not regress
  the byte-for-byte behaviour for a visitor who never asks for it — including
  the camera never turning on.
- A *portfolio* asking for camera permission is a surprise. If the feature
  exists at all it must be visibly the visitor's choice, with no ambient
  prompt and no background detection.

## Solution

Add **The Reach** — an opt-in, additive control layer that lets the visitor
steer the Void with their bare hand, seen by the device's front camera. An
**open palm** becomes a joystick: its offset from a centred **rest zone**
pans the camera (`camTarget.x` / `camTarget.y`), and its apparent size flies
the camera through depth (`camTarget.z`). A **pinch-grab** (thumb + index
together) triggers **Focus** on the frame currently centred in front of the
camera; opening the hand releases it. There is no on-screen camera preview —
feedback is a small **reticle** that represents the joystick knob, plus a
persistent **camera-active indicator**.

The Reach is **off by default and only enables when the visitor opts in**.
The opt-in affordance is a clearly-labelled **CTA button** on the Void
("Steer with your hand"), placed so a first-time visitor reads it as an
offered upgrade rather than an ambient widget. Until the visitor presses
that button, the camera is never requested, the hand model is never
downloaded, and the Void is byte-for-byte the experience it is today. Once
The Reach is on, the existing wheel / drag / touch inputs keep working
alongside it — they write into the same `camTarget` channels, so a mouse
drag and a hand wave compose naturally.

Under `prefers-reduced-motion` the CTA is not rendered at all — The Reach
is an explicitly motion-first experience and should not be offered to a
visitor who has opted out of motion.

The new canonical vocabulary follows the spirit of the existing glossary
(**The Void**, **The Mosaic**, **Glissando**, **Focus**): **The Reach** for
the mode, **the reticle** for the on-canvas joystick knob, **pinch-grab**
for the gesture, **rest zone** for the centred dead-zone.

## User Stories

1. As a first-time visitor to the Void who never wants to use their camera,
   I want the Void to behave exactly as it does today — same intro, same
   wheel / drag / touch, same Focus, same idle sway — so that nothing about
   the feature touches me unless I ask for it.
2. As a first-time visitor to the Void, I want to see a clearly labelled
   **CTA button** offering "steer with your hand" once the intro is done, so
   that I understand a richer way to fly the Void is available and is my
   choice to take.
3. As a visitor who never presses the CTA, I want my browser to *never*
   request camera permission and the hand-tracking model to *never* be
   downloaded, so that the feature carries zero cost to me — not in
   bandwidth, not in privacy, not in a permission prompt I never asked for.
4. As a visitor with `prefers-reduced-motion` enabled, I want the CTA to
   be absent from the Void entirely, so that I am not offered an experience
   I have already told the platform I do not want.
5. As a visitor who has just pressed the CTA, I want the browser to ask for
   front-camera permission *now* — not before, not later — so that the
   permission prompt is unambiguously the consequence of my own action.
6. As a visitor who has just enabled The Reach, I want a brief calibration
   ("hold your hand up") that captures my neutral hand size and centre, so
   that the rest zone and push/pull feel personalised rather than generic.
7. As a visitor steering with my hand, I want my palm's offset from the
   rest zone to pan the camera in that direction, so that the open hand
   feels like a joystick.
8. As a visitor steering with my hand, I want bringing my hand *closer* to
   the camera to fly me forward through the field, and pulling it back to
   fly me away, so that depth is a natural extension of the same gesture
   that pans.
9. As a visitor steering with my hand, I want returning my hand to the
   rest zone to coast me to a stop on the Void's existing inertia, so that
   the motion model matches what wheel / drag already feel like rather than
   slamming to a halt.
10. As a visitor steering with my hand, I want pinching my thumb and index
    together to **Focus** the frame I am currently pointed at, so that the
    gesture has the same meaning as a desktop click or a phone tap.
11. As a visitor with a frame focused, I want opening my hand to release
    that Focus, so that the pinch-grab feels like a literal grab and
    release.
12. As a visitor steering with my hand, I want the **reticle** on the
    canvas to show me where my hand is relative to the rest zone, so that
    I have feedback without a camera preview of my own face.
13. As a visitor whose camera is live, I want a persistent **camera-active
    indicator** on the screen for as long as the camera is on, so that I
    am never in doubt that the stream is actually live.
14. As a visitor who has enabled The Reach, I want the existing wheel /
    drag / touch inputs to keep working alongside my hand, so that I can
    fall back to my pointer at any time without first disabling anything.
15. As a visitor using a mouse and my hand simultaneously, I want the two
    inputs to compose smoothly rather than fight, so that the experience
    feels like adding a channel rather than swapping one.
16. As a visitor whose hand has left the frame, I want the Void to coast
    to rest on its existing inertia rather than freeze or snap, so that
    losing tracking is forgiving rather than punishing.
17. As a visitor whose hand has been out of frame for a couple of seconds,
    I want a quiet "show your hand" hint, so that I understand the
    tracking is waiting on me rather than broken.
18. As a visitor on a phone, I want The Reach to be offered with the same
    CTA, so that the experience is not desktop-only; I accept that one-
    handed phone use of it is awkward.
19. As a visitor on a slower device, I want the hand-tracking rate to
    degrade gracefully — slower detection, never a janky render — so
    that turning The Reach on never makes the Void itself feel worse.
20. As a visitor who has denied the camera permission, I want a graceful
    failure message and the Void to remain fully usable by mouse / touch,
    so that I am never trapped.
21. As a visitor who has enabled The Reach and now wants out, I want a
    clear way to turn it back off (the same affordance, the Esc key, or
    closing the tab), and I want the camera light to go out the moment I
    do, so that "off" is unambiguous.
22. As a visitor who switches tabs away from the Void, I want the camera
    stream to be released immediately, so that an inactive tab is never
    silently holding the camera.
23. As a visitor, I want the hand-tracking to run **entirely on my device**,
    with no frames sent to a server, so that enabling The Reach is a
    privacy-bounded choice.
24. As a future maintainer reading the codebase, I want the new vocabulary
    (**The Reach**, **the reticle**, **pinch-grab**, **rest zone**) to be
    written into `CONTEXT.md` when the feature ships, so that the
    significant new input source is documented in the same glossary as
    Focus, Glissando, and the Mosaic.
25. As a future maintainer, I want an ADR captured for "hand tracking is
    an additive input source that writes into `camTarget`," so that the
    surprising architectural choice (camera + WASM model on a portfolio)
    has a written rationale.

## Implementation Decisions

### Opt-in surface — the CTA button

The Reach is gated behind an explicit CTA button on the Void. The CTA is
the *only* way to enable the feature; there is no hotkey, no auto-enable,
no URL parameter. Specifically:

- The CTA is a primary call-to-action — labelled (e.g. "Steer with your
  hand"), readable as a button at a glance, not a hint or a footnote. It
  lives on the Void, near the existing `void-hint` region, and is shown
  only after `introDone`.
- The CTA is *not* rendered under `prefers-reduced-motion`. No alternative
  affordance is offered to that visitor. (Reduced-motion is treated as a
  signal that The Reach should not be advertised at all, not as a layout
  to fall back to.)
- The CTA toggles The Reach. While off it reads as an enable CTA; while
  on, it reads as a disable affordance (same control, two states). The
  Esc key and the `visibilitychange` event also disable The Reach.
- The CTA press is the *only* moment at which `getUserMedia` is called
  and the MediaPipe model is requested. Neither is touched on page load
  or on intro completion.
- Pressing the CTA also calls `hideUiForever()`, treating it as a "first
  interaction" the way the existing inputs do.

### Camera lifecycle

- Enable (CTA pressed): request `getUserMedia({ video: { facingMode: 'user' } })`,
  show the persistent camera-active indicator, lazy-load the MediaPipe
  Tasks Vision `HandLandmarker` from CDN, start the detection loop, run
  the brief calibration.
- Disable (CTA toggled off, Esc, or tab hidden via `visibilitychange`):
  call `track.stop()` on every track in the stream, tear down the
  detection loop, remove the reticle and the camera-active indicator.
  After disable, the next enable starts a fresh permission flow.
- Permission denial, missing camera, model load failure: surface a quiet
  failure state on the CTA, leave the Void fully usable by mouse / touch.

### Hand-tracking pipeline

- Single hand (`numHands: 1`, `runningMode: 'VIDEO'`). WASM assets and
  the model loaded from CDN, matching how Three.js r128 is already
  delivered.
- Detection runs in its own loop (rAF or `setTimeout`), throttled to
  roughly 30 Hz on desktop and reduced further under `IS_MOBILE` or
  when frame time degrades. The render loop is never blocked on
  inference — it reads the latest smoothed hand state, nothing more.
- Raw landmarks are smoothed (a One-Euro filter or a per-frame lerp)
  before anything reaches `camTarget`, so jitter does not propagate
  into the camera.

### Hand → `camTarget` mapping (the existing seam)

The Reach contributes its per-frame deltas to the same `camTarget` channels
every existing input already mutates. This is the single load-bearing
architectural decision: The Reach is just one more writer to `camTarget`,
inheriting the chase loop, drag inertia (`panVX/panVY`, `PAN_FRICTION`),
fly momentum (`zVel`, `FLY_FRICTION`), Focus tween, and idle sway for
free.

- **Pan:** palm-centre offset from the rest zone, scaled by a new
  `REACH_PAN` constant, added to `camTarget.x` / `camTarget.y` with the
  sign chosen to match the existing drag direction.
- **Depth:** apparent hand size (e.g. wrist→middle-MCP span) minus the
  per-visitor calibrated neutral, scaled by `REACH_FLY`, added to
  `camTarget.z` — bigger hand ⇒ `z` decreases ⇒ fly forward, matching
  wheel and touch sign.
- **Guard:** while `focused`, The Reach contributes zero — Focus owns
  the camera, exactly like the existing inertia guards (`if (!focused)…`).
- **Mapping is rate, not absolute.** Hand offset = velocity, applied
  every frame; return to the rest zone to coast to rest. The Void's
  field is effectively infinite, and absolute mapping would run the
  hand out of camera frame immediately.

### Pinch-grab → Focus

- Pinch detection = normalised thumb-tip ↔ index-tip distance below a
  threshold, with hysteresis so it does not chatter.
- On pinch down: call `setFocus(raycastFrames(W/2, H/2))` if a frame is
  centred; if already focused on a different centred frame, switch.
- On open hand: `releaseFocus()`.
- This mirrors the existing click/tap focus logic that already calls
  `raycastFrames` with the click coordinates — the only change is that
  the coordinates are the screen centre rather than the click position.

### The reticle and the camera-active indicator

- **Reticle:** a lightweight on-canvas joystick knob (DOM/CSS dot or a
  Three sprite) showing the palm's offset from the rest zone. Subtle
  ring while inside the rest zone, brighter as it pushes out, a
  visually distinct state while pinch-grabbing. Visible **only while
  The Reach is active**.
- **Camera-active indicator:** a small persistent dot or label, always
  visible while the stream is live. It is non-decorative — its job is
  privacy honesty, since there is no on-screen camera preview.

### Tunable constants

New `REACH_*` constants (`REACH_PAN`, `REACH_FLY`, `REACH_REST_ZONE`,
`REACH_DETECTION_HZ`, pinch threshold, smoothing parameters) sit alongside
the existing `PAN_SPEED`, `SCROLL_SPEED`, `TOUCH_PAN_X`, `TOUCH_FLY`,
`FOCUS_DIST`, frictions block — one tunable surface, not scattered.

### Vocabulary and documentation (deferred to build)

When The Reach ships:

- Write **The Reach**, **the reticle**, **pinch-grab**, and **rest zone**
  into `CONTEXT.md` under *Behavioural vocabulary* and *Things on the
  screen*.
- Cut an ADR for "hand tracking is an additive input source that writes
  into `camTarget`" — the choice is real and somewhat surprising, and
  the existing ADR set already covers smaller decisions.

These are deferred to the build, not the PRD.

## Testing Decisions

This is a static portfolio site with no automated test framework — the
existing PRDs verify against externally observable behaviour, never against
JS internals (the joystick state object, the smoothing filter, the pinch
hysteresis, the detection loop's identity). The Reach is no different.

The good test for this feature watches what happens on the canvas and at
the camera light, not what happens inside the script. Module-style
"the smoothing filter outputs X" tests would couple to a choice that is
expected to be tuned during build.

Verification matrix, run as a manual checklist across desktop webcam and a
real mobile front camera:

1. **Default visitor (CTA never pressed):** the Void is byte-for-byte
   identical to today — same intro, wheel/drag/touch, Focus, idle sway.
   *No camera permission prompt ever fires, and DevTools Network shows
   no MediaPipe / WASM requests.*
2. **CTA visibility:** the CTA appears once `introDone` is true, is
   absent under `prefers-reduced-motion`, and is the only path to
   enabling The Reach.
3. **Enable flow:** pressing the CTA fires the camera permission prompt
   for the first time, runs the calibration, and shows the reticle plus
   the camera-active indicator.
4. **Pan steering:** open-palm offset from the rest zone pans
   `camTarget.x / y` in the matching direction; the magnitude tracks the
   offset rather than being binary.
5. **Depth steering:** bringing the hand closer flies forward; pulling
   back flies away; returning to the neutral coasts to rest on the
   existing inertia.
6. **Pinch-grab Focus:** pinching focuses the centred frame; opening
   releases. Pinching again on a different centred frame switches.
7. **Mouse + hand together:** a mouse drag and a hand wave compose
   without fighting; mouse pan with hand in the rest zone behaves like
   the mouse alone.
8. **Tracking loss:** when the hand leaves frame, motion decays to rest
   with no freeze or snap; after ~2 seconds the "show your hand" hint
   appears and clears when the hand returns.
9. **Disable flow (toggle, Esc, tab-hide):** the camera light goes out,
   the reticle and indicator vanish, the Void reverts to pointer/touch.
   A subsequent enable starts a fresh stream.
10. **Permission denied:** the CTA reports a graceful failure; the Void
    stays fully usable.
11. **Reduced motion:** the CTA is not rendered; the Void never asks
    for the camera.
12. **Mobile front camera:** functional within accepted ergonomic
    limits; frame rate degrades gracefully rather than janking the
    render.
13. **Privacy boundary:** a network inspector across a full session
    that does not enable The Reach shows no `getUserMedia` activity
    and no model downloads.

Prior art for this style of behavioural verification matrix: the
verification checklists at the end of
[plan-the-reach.md](../../plan-the-reach.md) and
[docs/prd/footer-wordmark-touch-interaction.md](footer-wordmark-touch-interaction.md)
both follow this pattern — observable outcomes, not internals.

## Out of Scope

- Writing the new terms into `CONTEXT.md` or cutting the ADR — deferred
  to the build, per the convention used for prior features.
- Multi-hand or two-handed gestures. v1 is single-hand only.
- Replacing or removing any existing mouse / wheel / touch input. The
  Reach is strictly additive.
- Gesture customisation, left/right-hand handedness beyond the neutral
  calibration capture, or any per-visitor tuning UI.
- Any change to the Void's visuals, frames, intro, idle sway, or Focus
  behaviour itself.
- Any on-screen camera preview. The reticle plus the camera-active
  indicator are the only feedback channels; a self-view is explicitly
  not provided.
- Any auto-enable, hotkey-enable, or URL-parameter-enable path. The CTA
  is the only enable surface.
- Any application of The Reach to surfaces other than the Void (the
  Projects index, the Mosaic, the Listing). Out of scope for v1.

## Further Notes

- The Reach is load-bearing on the architectural choice that *every*
  motion input mutates `camTarget` and nothing else. That choice predates
  this PRD and is the reason hand tracking can be added without touching
  the render loop, the inertia model, or Focus.
- The accepted caveats for mobile (one-handed steering is awkward;
  selfie cam + WebGL + WASM model strain mobile GPUs) are accepted at
  the PRD level so the build does not have to re-decide them. Mitigation
  is throttled detection on `IS_MOBILE`, not a different UI.
- The "opt-in" framing is doubled — it is both a privacy posture (no
  silent camera) and a performance posture (no lazy-loaded model for
  the default visitor). The CTA is what makes both true.
- The PRD intentionally avoids file paths and line numbers; the plan
  file [plan-the-reach.md](../../plan-the-reach.md) carries the
  current seams for the implementer to read at the moment of build.
