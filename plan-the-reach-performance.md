# Plan — The Reach: de-jank / performance

## Goal

Make **The Reach** feel smooth on weak hardware — explicitly down to
**mid-range phones** (a 2–3 year-old Android, an older iPhone), not just
desktops. Today, with The Reach on, four symptoms appear together on such
devices: the whole **Void** stutters, the hand response feels laggy, **the
reticle** steps instead of gliding, and there's a hitch when first enabling it.

This is a pure optimization. The Void, the gesture vocabulary (open-palm steer,
**the clutch**, pinch-grab → **Focus**), the additive-`camTarget` architecture
of [ADR 0010](docs/adr/0010-the-reach-additive-camtarget-writer.md), and the
clutch re-anchor of [ADR 0011](docs/adr/0011-the-reach-clutch-calib-size-reanchor.md)
all behave **exactly** as they do today. Nothing the visitor can name changes.

## Why it janks today (root cause)

All four symptoms share **one** cause: inference runs **synchronously on the
main thread**.

- `reachDetect()` calls `reach.landmarker.detectForVideo(reach.videoEl, ts)`
  synchronously ([index.html:1323](index.html)), inside a `setTimeout` loop at
  `REACH_DETECTION_HZ` (30 desktop, 18 mobile — [index.html:639](index.html)).
- JavaScript is single-threaded, so every inference call competes for the
  **same** thread as the Three.js `render()` loop. A 25–40 ms inference call on
  a weak GPU/CPU **must** drop render frames. Hence:
  - **Void stutters** — `render()` can't paint while `detectForVideo` runs.
  - **Laggy response** — `reach.hand` is stale until inference returns.
  - **Reticle steps** — `reachApplyToTarget()` runs every render frame
    ([index.html:1744](index.html)) but reads `reach.hand`, which only changes
    18–30×/sec, so the reticle transform is a step function.
  - **Startup hitch** — model + WASM load lands on the main thread on enable.
- Secondary contributors: `getUserMedia` requests **no resolution cap**
  ([index.html:1233](index.html)), so the browser hands over a 720p/1080p
  stream and inference cost scales with it; and the desktop **GPU delegate**
  ([index.html:1208](index.html)) shares the GPU with the Void's WebGL.

The fix is to stop the render loop from ever waiting on inference, then shave
the per-frame cost and decouple the reticle from detection rate.

## Naming (no new glossary terms)

This change introduces **no** new canonical vocabulary. Everything it touches —
**The Reach**, **the reticle**, **the rest zone**, **the clutch**,
**depth-clutched** — is already in `CONTEXT.md`. The new concepts (a detection
worker, frame transfer, adaptive detection rate) are *implementation*, not
domain language, so `CONTEXT.md` is **not** edited. The site's behavioural
vocabulary is unchanged.

## Decisions (locked via grill)

1. **Move inference into a dedicated Web Worker.** A worker is spun up on
   enable and owns the `HandLandmarker`. The main thread sends camera frames in
   and receives landmarks out; it **never** blocks on `detectForVideo`. This is
   the load-bearing change and the reason the Void stops stuttering. *(ADR 0012
   at build.)*
2. **The worker does inference *only*; all derivation stays on the main
   thread.** Only the 21 raw landmarks (63 floats) cross the boundary. Every
   existing main-thread computation is preserved byte-for-byte: palm/size/curl
   derivation, the 12-sample calibration, `REACH_SMOOTH` smoothing, the clutch
   state machine, and the ADR 0010 / ADR 0011 re-anchoring. The derivation is a
   handful of `sqrt`s — it was never the bottleneck. This keeps the blast radius
   to "where the landmarks come from," nothing else.
3. **Frame delivery = `createImageBitmap` everywhere.** Each detection tick the
   main thread calls `createImageBitmap(reach.videoEl)` and **transfers** the
   bitmap to the worker (zero-copy transfer, then `bitmap.close()`). One code
   path that works on iOS Safari, Firefox, and Chromium. The only main-thread
   cost left is a ~1–2 ms GPU frame-copy — versus the 25–40 ms inference call it
   replaces. (`MediaStreamTrackProcessor`'s zero-copy `VideoFrame` transfer is a
   Chromium-only micro-optimisation, explicitly **deferred** — not worth two
   code paths.)
4. **Enable cross-origin isolation, guarded.** Add COOP/COEP headers via
   `vercel.json` so MediaPipe's WASM can use threads + SIMD. The Reach
   **feature-detects `crossOriginIsolated`**: it uses the multithreaded path
   when available and still works single-threaded when not. Every cross-origin
   resource (CDN scripts, the model `.task`, WASM, fonts) is audited for
   CORS/CORP **first** so the rest of the site doesn't break. *(ADR 0013 at
   build.)*
5. **Cap capture resolution.** Request a downscaled stream
   (`width: { ideal: 480 }, height: { ideal: 360 }`, keep `facingMode: 'user'`).
   Near-free, large per-frame saving; hand-tracking landmark accuracy is
   unaffected at this scale.
6. **Glide the reticle at render rate.** Decouple the reticle from detection
   rate: keep a displayed position that eases toward the latest landmark
   **every render frame** (60 fps), instead of snapping at 18–30 Hz. Purely the
   reticle's *display* path — the `camTarget` contributions are unchanged
   (they already accumulate per frame and inherit the chase-loop smoothing).
7. **Adaptive degradation + dev instrumentation.** Measure render frame-time;
   on sustained jank, step `REACH_DETECTION_HZ` down (30 → 24 → 18 → 12) with a
   hard floor, and step back up when healthy. A dev-only FPS / inference-time
   overlay proves the fix and drives the throttle. This *replaces* the vague
   "bail gracefully if frame time degrades" note in
   [plan-the-reach.md](plan-the-reach.md).
8. **Delegate split: desktop GPU, mobile CPU.** Keep the GPU delegate on
   desktop (it has headroom). On mobile, with cross-origin isolation enabling
   multithreaded WASM, run the **CPU** delegate so inference uses spare CPU
   cores instead of fighting the WebGL GPU that is already busy drawing the
   Void. This preserves the existing `IS_MOBILE` split at
   [index.html:1208](index.html) and gives it a real performance rationale.

## Current state (the seams this plugs into)

All in `index.html`'s inline Void script:

- **`reachScheduleDetection()`** — the `setTimeout` loop that paces detection.
  Becomes: grab a frame, transfer it to the worker. [index.html:1308](index.html)
- **`reachDetect()`** — today: call `detectForVideo`, then derive palm/size/curl,
  calibrate, smooth, run the clutch state machine. Split: the
  `detectForVideo` call leaves for the worker; **everything from the landmark
  read onward stays**, fed by the worker's reply instead of a local result.
  [index.html:1317](index.html)
- **`loadHandLandmarker()`** — creates the `FilesetResolver` + `HandLandmarker`
  with the `delegate` choice. Moves *into* the worker; the delegate split
  (Decision 8) lives here. [index.html:1198](index.html)
- **`reachApplyToTarget()`** — runs every render frame; owns the reticle
  transform and class toggles. The reticle-glide easing (Decision 6) lands
  here. The `camTarget` math is untouched. [index.html:1445](index.html)
- **`enableReach()` / `disableReach()`** — the camera + model lifecycle. The
  worker is created in `enable` and **terminated** in `disable`, alongside the
  existing `track.stop()` / element teardown. [index.html:1222](index.html),
  [index.html:1274](index.html)
- **`REACH_*` constants** — one block at [index.html:626](index.html). New
  tunables (resolution, reticle-ease factor, adaptive Hz floor) join it, keeping
  the tunable surface a single block per ADR 0010.
- **`getUserMedia` constraints** — [index.html:1233](index.html), where the
  resolution cap (Decision 5) is added.

## Implementation (phased — design only, no code yet)

### Phase 0 — Instrumentation (prove the baseline)
- Add a dev-only overlay: render FPS (EMA), last inference time, current
  detection Hz. Gated behind a flag/URL param so it never ships visibly.
- Capture before/after numbers on a real mid-range phone — this is the
  acceptance evidence and the input to the adaptive throttle.

### Phase 1 — Cheap wins (no worker yet)
- Cap capture resolution in `getUserMedia` (Decision 5).
- Glide the reticle at render rate in `reachApplyToTarget()` (Decision 6).
- These two are independently shippable and already kill the reticle-step
  symptom and shave inference cost before the bigger change lands.

### Phase 2 — Worker offload (the core)
- New worker module that imports `tasks-vision`, creates the `HandLandmarker`,
  and on each `postMessage(imageBitmap)` runs `detectForVideo` and posts back
  the landmarks (or `null`).
- `reachScheduleDetection()` → `createImageBitmap(video)` + transfer to worker.
- `reachDetect()`'s body (from the landmark read down) becomes the worker's
  `onmessage` handler on the main thread — same math, same calibration, same
  clutch state machine, now fed by the reply.
- Worker created in `enableReach`, **terminated** in `disableReach`.
- Verify the Void no longer drops frames during inference (Phase 0 overlay).

### Phase 3 — Cross-origin isolation + delegate split
- Audit every cross-origin resource for CORS/CORP (CDN scripts, the model
  `.task`, the WASM, any fonts). Add `crossorigin` attributes where needed.
- Add `vercel.json` headers: `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless` if the
  audit shows a resource that can't send CORP — but `require-corp` is needed for
  iOS Safari isolation; weigh per audit).
- Feature-detect `crossOriginIsolated`; the Reach must still run if it's false.
- Wire the desktop-GPU / mobile-CPU delegate split (Decision 8) in the worker.

### Phase 4 — Adaptive degradation
- Frame-time monitor on the render loop; sustained over-budget ⇒ step
  `REACH_DETECTION_HZ` down with a floor; sustained healthy ⇒ step back up.
- Hysteresis so the rate doesn't oscillate. Drive it off the Phase 0 monitor.

## Risks / things to honour

- **COEP blast radius.** `require-corp` can break **any** cross-origin resource
  site-wide — not just the Void. The resource audit in Phase 3 is load-bearing,
  not optional. Ship the headers only after the whole site is verified under
  them. *(This is exactly why it warrants ADR 0013.)*
- **Worker + MediaPipe availability.** GPU delegate in a worker needs
  `OffscreenCanvas` WebGL (iOS Safari 16.4+). The CPU delegate works in a worker
  everywhere — the delegate split already routes mobile there. If worker
  creation or model init fails, fall back to a graceful failure exactly like a
  denied camera ([index.html:1266](index.html)) — never trap the visitor.
- **`createImageBitmap` cost on the main thread.** It's ~1–2 ms but non-zero;
  call it at detection rate, not render rate, and `close()` every bitmap to
  avoid leaks.
- **Behaviour parity.** Because all derivation stays main-thread (Decision 2),
  the clutch, calibration, and ADR 0010/0011 logic are unchanged. Regression
  test the clutch + Focus paths explicitly — they must feel identical.
- **Privacy posture is untouched.** Opt-in, the camera-active indicator, and
  instant `track.stop()` on disable all remain. The worker is terminated on
  disable too.

## Out of scope (this plan)

- Any change to the gesture vocabulary, pan/fly gains, rest-zone radius, pinch
  hysteresis, or clutch behaviour — this is performance only.
- `MediaStreamTrackProcessor` / zero-copy `VideoFrame` transfer (Chromium-only
  micro-opt; `createImageBitmap` is the chosen universal path).
- Multi-hand tracking, a lighter/heavier model variant, or model swapping.
- Writing glossary terms into `CONTEXT.md` (none are needed) or cutting the
  ADRs now — ADRs 0012 (worker offload) and 0013 (cross-origin isolation) are
  **deferred to build time**, per the convention set by
  [plan-the-reach.md](plan-the-reach.md) and
  [plan-the-reach-clutch.md](plan-the-reach-clutch.md).

## Verification (manual + measured, when built)

In the spirit of the existing Reach verification matrices — what happens on the
canvas and in the numbers, not inside the script:

1. **Default visitor (no opt-in):** the Void is byte-for-byte unchanged; no
   worker, no camera prompt, no headers-related breakage anywhere on the site.
2. **Mid-range phone, Reach on:** the Void holds frame rate while a hand steers
   — the Phase 0 overlay shows render FPS staying near target *during*
   inference, where it previously dipped.
3. **Reticle glides**, not steps, even at 18 Hz detection.
4. **Clutch + Focus regression:** fist pins depth, open resumes without a jerk
   (ADR 0011), pinch-grab focuses the centred frame — all identical to today.
5. **Cross-origin isolation:** `crossOriginIsolated === true` in the console on
   the live site; the rest of the site (images, fonts, other pages) loads
   normally under the headers; the Reach also still runs in a build with the
   headers removed (fallback path).
6. **Adaptive throttle:** on a deliberately throttled device, detection Hz steps
   down and the Void stays smooth rather than janking; it steps back up when
   the device recovers.
7. **Disable / tab-hide / Esc:** camera light out, worker terminated, indicator
   and reticle gone — same teardown guarantees as today.
8. **Reduced motion:** the CTA is still absent; nothing here changes that.

## Docs to write at build time

- **ADR 0012 — Hand inference runs in a Web Worker.** Why: hard to reverse
  (the detection pipeline's threading model), surprising (a portfolio offloading
  to a worker + transferring frames), a real trade-off (worker plumbing +
  frame-copy vs a blocked render loop). Records Decisions 1–3.
- **ADR 0013 — The site is cross-origin isolated.** Why: hard to reverse
  (site-wide headers affecting every cross-origin resource), surprising (COI on
  a static portfolio), a real trade-off (CORS/CORP blast radius vs multithreaded
  WASM). Records Decision 4 and the guarded/feature-detected fallback.
