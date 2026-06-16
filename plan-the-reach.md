# Plan — The Reach (steer the Void with your hand)

## Goal

Let a visitor fly through **the Void** (`index.html`) using their bare hand,
captured by the device's **front camera**. An open palm becomes a joystick that
**pans** and **flies** the camera through the field; a **pinch** **grabs** the
frame centred in front of them (the existing **Focus**). It is an **opt-in,
additive** control layer — the Void behaves exactly as it does today for anyone
who never turns it on, and mouse / wheel / touch keep working *while* The Reach
is active.

> Yes, this is possible entirely in the browser, with no server and no build
> step: the front camera via `getUserMedia`, and an on-device hand model
> (MediaPipe Tasks Vision `HandLandmarker`) loaded from a CDN — the same
> delivery the Void already uses for Three.js r128.

## Naming (proposed glossary terms)

This feature introduces new canonical vocabulary, in the spirit of the existing
glossary (**The Void**, **The Mosaic**, **Glissando**, **Focus**):

- **The Reach** — the mode in which the visitor steers the Void with a hand
  seen by the front camera. Toggled on; off by default.
- **The reticle** — the on-canvas cursor shown *only while The Reach is active*
  that represents the hand's offset from rest (the "joystick knob"). There is no
  camera preview on screen.
- **Pinch-grab** — pinching thumb + index to trigger **Focus** on the centred
  frame; opening the hand releases it. The gesture counterpart to a desktop
  click or a touch tap.
- **Rest zone** — the neutral dead-zone at the centre of the camera frame. Hand
  inside it ⇒ no motion (coast to a stop); hand outside it ⇒ drift in that
  direction at a speed proportional to the offset.

> These are **not yet written into `CONTEXT.md`** — this is "just a plan file
> for now" per the request. When The Reach actually ships, add the four terms
> above to `CONTEXT.md` under *Behavioural vocabulary* / *Things on the screen*.
> An ADR for "hand tracking is an additive input source that writes into
> `camTarget`" may also be warranted then (it's a real, somewhat surprising
> architectural choice) — deferred until build.

## Decisions (locked via grill)

1. **Opt-in additive layer.** The Reach is OFF by default. A visitor enables it
   from an affordance on the Void. When on, it writes into the *same*
   `camTarget` channels as wheel / drag / touch — it never replaces them, and
   both can be used at once. The Void is byte-for-byte unchanged for anyone who
   doesn't opt in.
2. **It drives all three motion channels:** pan (`camTarget.x/y`), depth
   (`camTarget.z`), and **Focus** (`setFocus` / `releaseFocus`).
3. **Gesture vocabulary = palm-steer + pinch-focus** (one hand):
   - **Open palm position** steers — its offset from the **rest zone** pans, and
     its **apparent size** (closer to camera ⇒ bigger ⇒ fly forward) drives
     depth. One open hand pans and flies simultaneously, like steering.
   - **Pinch-grab** (thumb + index together) ⇒ Focus the centred frame;
     releasing the pinch ⇒ release Focus.
4. **Rate / joystick mapping, not absolute.** Hand offset from the rest zone =
   *velocity*, applied every frame as `camTarget += offset * gain`. Return to
   the rest zone to coast to a stop on the Void's existing inertia. This matches
   the Void's `camTarget +=` + friction model and suits an effectively infinite
   field. (Absolute 1:1 mapping was rejected — you'd run out of camera frame
   immediately and depth would be cramped.)
5. **Any device with a camera** offers The Reach — desktop *and* mobile front
   camera. (See *Risks* for the mobile ergonomics/perf caveats accepted with
   this choice.)
6. **No on-screen camera preview.** Feedback is **the reticle** on the canvas
   plus a persistent **"camera active" indicator** for privacy honesty (there's
   no self-view to signal that the camera is live).
7. **On-device only.** Frames never leave the browser; nothing is recorded or
   uploaded. The camera stream is acquired only after the visitor opts in and is
   **fully released** (`track.stop()`) the moment The Reach is turned off.
8. **Reduced motion suppresses the affordance.** Under
   `prefers-reduced-motion`, the "enable The Reach" affordance is not shown —
   consistent with the site's reduced-motion stance; The Reach is an explicitly
   motion-first, opt-in experience.

## Current state (the seams The Reach plugs into)

All in `index.html`'s inline Void script:

- **`camTarget.{x,y,z}`** — the single chased target. Every existing input
  (wheel `index.html:726`, desktop drag `index.html:781`, mobile pan/fly
  `index.html:891`) does nothing but mutate this. The Reach is just one more
  writer. [index.html:603](index.html)
- **`render()`** — the per-frame loop: it eases `cam` toward `camTarget`
  (`LERP_CAM`), applies drag inertia (`panVX/panVY`, `PAN_FRICTION`) and fly
  momentum (`zVel`, `FLY_FRICTION`), runs the Focus tween, and drives idle sway.
  The Reach contributes its per-frame `camTarget` deltas *before* this chase, so
  it inherits all the existing smoothing and inertia for free.
  [index.html:958](index.html)
- **`setFocus(mesh)` / `releaseFocus()`** — glide a frame front-and-centre and
  let it go. [index.html:661](index.html), [index.html:691](index.html)
- **`raycastFrames(clientX, clientY)`** — returns the frame under a screen
  point. Passing the screen centre (`W/2, H/2`) yields the frame the camera is
  pointed at — exactly what **pinch-grab** should Focus.
  [index.html:705](index.html)
- **`introDone`, `hideUiForever()`** — The Reach must only act after the intro,
  and enabling it should `hideUiForever()` like any other first interaction.
- **`IS_MOBILE`** — already partitions input; The Reach is offered on both
  branches, so it lives *outside* that partition (its own block).
- **Tunable constants** sit in one block (`PAN_SPEED`, `SCROLL_SPEED`,
  `TOUCH_PAN_X`, `TOUCH_FLY`, `FOCUS_DIST`, frictions…). The Reach adds its own
  `REACH_*` constants alongside them. [index.html:305](index.html)

## Implementation (phased — this plan is design only, no code yet)

### Phase 0 — Affordance & camera lifecycle
- Add an unobtrusive **"steer with your hand"** affordance to the Void (near the
  existing `void-hint`), shown only when `introDone` and *not* under
  `prefers-reduced-motion`.
- On enable: `getUserMedia({ video: { facingMode: 'user' } })`, show the
  persistent **camera-active indicator**, `hideUiForever()`.
- On disable (toggle off, Esc, or tab hidden via `visibilitychange`): stop every
  track, tear down the model loop, hide the reticle and indicator.

### Phase 1 — Hand tracking pipeline
- Load MediaPipe Tasks Vision `HandLandmarker` from CDN (`numHands: 1`,
  `runningMode: 'VIDEO'`), WASM assets from CDN. Lazy-load **only** when The
  Reach is first enabled — zero cost to the default Void.
- Run detection in its own rAF/`setTimeout` loop, **throttled** (e.g. ~30 Hz),
  decoupled from the 60 fps Three render loop. The render loop reads the latest
  smoothed hand state; it never blocks on inference.
- Smooth raw landmarks (a One-Euro filter or simple lerp) to kill jitter before
  anything reaches `camTarget`.

### Phase 2 — Map hand → `camTarget` (the seam)
Each Three frame, derive from the latest hand state:
- **Pan:** palm-centre offset from the **rest zone**, scaled by `REACH_PAN`,
  added to `camTarget.x` / `camTarget.y` (sign mirrored to match drag).
- **Depth:** apparent hand size (e.g. wrist→middle-MCP span) minus a calibrated
  neutral, scaled by `REACH_FLY`, added to `camTarget.z` — bigger hand ⇒ fly
  forward (`z` decreases), matching wheel/touch sign.
- Apply nothing while `focused` (Focus owns the camera), exactly like the
  existing inertia guards (`if (!focused) …`).
- A short **calibration** on enable ("hold your hand up"): capture the neutral
  hand size and centre so push/pull and the rest zone are personalised.

### Phase 3 — Pinch-grab → Focus
- Detect pinch = normalized thumb-tip↔index-tip distance below a threshold (with
  hysteresis so it doesn't chatter).
- Pinch down ⇒ `setFocus(raycastFrames(W/2, H/2))` if a frame is centred; if
  already focused on a different centred frame, switch; open hand ⇒
  `releaseFocus()`. Mirrors the click/tap focus logic at
  [index.html:744](index.html) and [index.html:911](index.html).

### Phase 4 — The reticle & indicator
- Reticle: a lightweight DOM/CSS dot (or a Three sprite) showing the hand's
  offset from the rest zone — the joystick knob. Subtle ring when inside the
  rest zone, brighter as it pushes out; distinct state while pinch-grabbing.
- Camera-active indicator: small persistent dot/label, always visible while the
  stream is live.

## Risks / things to honour

- **Mobile (accepted caveat).** Holding a phone one-handed while steering with
  the other is awkward, and selfie-cam + WebGL + WASM model together strain
  mobile GPUs/battery. Mitigate: lower detection Hz on `IS_MOBILE`, consider a
  reduced model complexity, and bail gracefully if frame time degrades.
- **No hand / tracking lost.** When no hand is detected, contribute **zero**
  delta — the Void simply coasts to rest on existing inertia. Never freeze or
  snap. Surface a quiet "show your hand" hint after a couple of seconds of loss.
- **Permission denied / no camera.** The affordance reports a graceful failure
  and the Void stays fully usable by mouse/touch. Never trap the visitor.
- **Both inputs at once.** Because The Reach only adds to `camTarget`, a mouse
  drag and a hand wave compose naturally; no special arbitration needed. Verify
  they don't fight (e.g. mouse pan while hand is in the rest zone = just the
  mouse).
- **Performance budget.** Inference must not starve the 60 fps render. Decouple
  the loops; if inference can't keep ~30 Hz, drop its rate, not the render's.
- **Privacy perception.** A camera turning on for a *portfolio* is a surprise —
  the opt-in, the always-visible active indicator, and instant
  release-on-disable are load-bearing, not nice-to-haves.

## Out of scope (this plan)

- Writing the terms into `CONTEXT.md` or cutting an ADR (deferred to build).
- Multi-hand / two-handed gestures (single hand only for v1).
- Replacing or removing any existing mouse / wheel / touch input.
- Gesture customisation, left/right-hand calibration beyond the neutral capture.
- Any change to the Void's visuals, frames, or Focus behaviour itself.

## Verification (when built)

- **Default visitor (no opt-in):** the Void is identical to today — same intro,
  wheel/drag/touch, Focus, idle sway. No camera prompt ever fires.
- **Enable The Reach (desktop webcam):** permission prompts once; calibration
  captures neutral; open-palm offset pans and push/pull flies, coasting to rest
  in the rest zone; pinch-grab focuses the centred frame and open-hand releases.
- **Mouse + hand together:** both move `camTarget` without fighting.
- **Tracking loss / hand out of frame:** motion decays to rest, no freeze/snap;
  "show your hand" hint appears, then clears when the hand returns.
- **Disable / tab hidden:** camera light goes out (tracks stopped), indicator
  and reticle vanish, Void reverts to pointer/touch.
- **Reduced motion:** the affordance is absent; the Void never asks for camera.
- **Mobile front camera:** functional within the accepted ergonomic limits;
  frame rate degrades gracefully rather than janking the render.
