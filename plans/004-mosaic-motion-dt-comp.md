# 004 — Make the living-Mosaic engine framerate-independent

- **Status**: DONE (implemented + verified numerically 2026-07-19; optional 120Hz-device check remains)
- **Commit**: f9a3ae9
- **Severity**: MEDIUM
- **Category**: Performance / cohesion (framerate-dependent eases)
- **Estimated scope**: 1 file (mosaic.js), 4 small edits inside the engine + 3 layers

## Problem

Every motion system in this codebase has been made framerate-independent —
except the living-Mosaic engine. The Void compensates every ease/friction
(`MOTION_DT_COMP`, index.html:756 and 2344–2357), the landing reel normalizes its
lerp to 60fps (script.js:777–779), and the About scrub clamps and scales by real
dt (listing.js:324). The Mosaic's three rAF layers still use raw per-frame
constants, so on a 90/120/144Hz display the drift chases ~1.5–2.4× stiffer than
designed, the gate shear decays faster than tuned, and during FPS dips the motion
goes sluggish — the exact failure the Void's `MOTION_DT_COMP` comment describes.

```js
/* mosaic.js:738–747 — current engine tick (no dt measurement) */
    var tick = function () {
      rafId = 0;
      var i;
      for (i = 0; i < layers.length; i++) layers[i].tick(state);
      var idle = true;
      for (i = 0; i < layers.length; i++) {
        if (!layers[i].atRest(state)) { idle = false; break; }
      }
      if (!idle) rafId = requestAnimationFrame(tick);
    };
```

```js
/* mosaic.js:822–823 — desktop Frame drift (EASE = 0.12, line 790) */
        actualX += (targetX - actualX) * EASE;
        actualY += (targetY - actualY) * EASE;
```

```js
/* mosaic.js:891, 908 — mobile Frame drift (EASE = 0.18, line 870) */
      tick: function () {
        …
            e.actualY += (target - e.actualY) * EASE;
```

```js
/* mosaic.js:965–972 — Gate shear (DECAY = 0.70, LERP = 0.35, lines 954–955) */
      tick: function () {
        /* Decay smoothed velocity so the grid eases back to 0° without
           requiring scroll events to stop it. */
        smoothedV *= DECAY;
        var targetDeg = smoothedV * FACTOR;
        if (targetDeg >  MAX_DEG) targetDeg =  MAX_DEG;
        if (targetDeg < -MAX_DEG) targetDeg = -MAX_DEG;
        currentDeg += (targetDeg - currentDeg) * LERP;
```

## Target

The engine measures real dt once per tick and exposes it on the shared `state` as
`dtN` (1.0 at exactly 60fps). Layers correct eases via `1 - Math.pow(1 - k, dtN)`
and decays via `Math.pow(f, dtN)` — mathematically identical at 60fps, same feel
at any refresh rate. This is the Void's exact formula set (index.html:2352–2357).

Engine (mosaic.js:722–766 region):

```js
    var state = {
      grid: grid,
      pointerX: 0,
      pointerY: 0,
      pointerInside: false,
      scrollY: window.pageYOffset || 0,
      scrollV: 0,
      dtN: 1
    };
    var rafId = 0;
    var prevTs = 0;

    /* … existing coordinator comment … */
    var tick = function (ts) {
      rafId = 0;
      /* Real frame dt in 60fps-frames (dtN = 1 at 60Hz, ~0.5 at 120Hz, ~2 at
         30fps). Clamped so a stall resumes gently — same recipe as the reel
         (script.js:777–779) and the Void's MOTION_DT_COMP (index.html:2344). */
      var dt = prevTs ? Math.min(ts - prevTs, 50) : 16.667;
      prevTs = ts;
      state.dtN = dt / 16.667;
      var i;
      for (i = 0; i < layers.length; i++) layers[i].tick(state);
      var idle = true;
      for (i = 0; i < layers.length; i++) {
        if (!layers[i].atRest(state)) { idle = false; break; }
      }
      if (!idle) rafId = requestAnimationFrame(tick);
      else prevTs = 0;   /* sleeping — the next wake must not span the idle gap */
    };
```

Desktop Frame drift (replace mosaic.js:822–823):

```js
        var k = 1 - Math.pow(1 - EASE, state.dtN);
        actualX += (targetX - actualX) * k;
        actualY += (targetY - actualY) * k;
```

Mobile Frame drift — change the layer signature at mosaic.js:891 from
`tick: function () {` to `tick: function (state) {`, hoist the corrected factor
once per tick (before the entries loop), and use it in the lerp at line 908:

```js
      tick: function (state) {
        var k = 1 - Math.pow(1 - EASE, state.dtN);
        var vh = window.innerHeight || 1;
        …
            e.actualY += (target - e.actualY) * k;
```

Gate shear — change the signature at mosaic.js:965 to `tick: function (state) {`
and correct both the decay and the lerp:

```js
      tick: function (state) {
        /* Decay smoothed velocity so the grid eases back to 0° without
           requiring scroll events to stop it. */
        smoothedV *= Math.pow(DECAY, state.dtN);
        var targetDeg = smoothedV * FACTOR;
        if (targetDeg >  MAX_DEG) targetDeg =  MAX_DEG;
        if (targetDeg < -MAX_DEG) targetDeg = -MAX_DEG;
        currentDeg += (targetDeg - currentDeg) * (1 - Math.pow(1 - LERP, state.dtN));
```

## Repo conventions to follow

- The exact formulas already in use: eases `1 - Math.pow(1 - k, dtN)`, decays
  `Math.pow(f, dtN)` — exemplar: index.html:2352–2373 (`kCam`, `fPan`).
- dt clamp of 50ms and the 16.667 anchor — exemplar: script.js:777–779.
- The constants themselves (`EASE`, `DECAY`, `LERP`) keep their names and values;
  only the per-frame application changes.

## Steps

1. In the `MosaicMotion` IIFE (mosaic.js:722–766): add `dtN: 1` to `state`,
   declare `var prevTs = 0;` beside `var rafId = 0;`, and replace the `tick`
   function with the Target version (signature `function (ts)`, dt measurement,
   `else prevTs = 0;` on the idle branch).
2. In `frameDriftDesktop` (mosaic.js:808–839): replace the two `* EASE` lerp
   lines (822–823) with the hoisted-`k` version from Target. The signature
   already receives `state`.
3. In `frameDriftMobile` (mosaic.js:890–917): change the tick signature to
   accept `state`, hoist `var k = 1 - Math.pow(1 - EASE, state.dtN);` at the top
   of tick, and replace `* EASE` at line 908 with `* k`.
4. In `gateShear` (mosaic.js:964–982): change the tick signature to accept
   `state`, and apply the two corrected lines from Target (968 and 972).

## Boundaries

- Do NOT touch the Spotlight layer (mosaic.js:1177–1180) — it has no eases.
- Do NOT touch the scroll-listener velocity math in gateShear (mosaic.js:984–993)
  — it already divides by real event dt.
- Do NOT change `REST*` thresholds, `MAX_DRIFT`, `MAX_DEG`, `FACTOR`, `SMOOTH`,
  or any reduced-motion gating (`MosaicMotion.enabled`).
- Do NOT add dt compensation anywhere else — every other system already has it.
- If any excerpt no longer matches (drift since f9a3ae9), STOP and report.

## Verification

- **Mechanical**: `node --check mosaic.js` exits clean. Identity check by hand:
  at `dtN = 1`, `1 - Math.pow(1 - 0.12, 1) === 0.12` and
  `Math.pow(0.70, 1) === 0.70` — the 60fps behavior is provably byte-identical.
- **Feel check** (honesty note: a true high-refresh check needs a 120Hz+ device;
  the identity above plus a slowdown test is the provable part):
  - Serve the site, open a photo project (e.g. `project.html?id=01`) on desktop.
    Move the cursor across the mosaic: photos drift toward it exactly as before
    (no change at 60Hz).
  - DevTools → Performance → CPU throttling 6× (forces a lower, uneven frame
    rate): the drift should still *converge at the same speed per second* —
    sluggish-feeling chase under throttle means a step was missed.
  - On a photo-only project, flick-scroll: the grid's subtle shear eases in and
    decays back within the same real-time window as before.
  - If a 120Hz phone or monitor is available: drift and shear should now feel
    identical to a 60Hz display rather than stiffer/snappier.
- **Done when**: all four edits are in, 60fps behavior is unchanged, and motion
  keeps its designed pace under CPU throttling.
