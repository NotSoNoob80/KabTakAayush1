# PRD — Wow-Factor Pass (The Hour · The Cover · Shutter drag)

## Problem Statement

A first-time visitor reading the site today sees considered work — but the
*medium* the work is shown in does not yet do anything that surprises them.
Photographs sit in good layouts, the Void flies cleanly, the Mosaic plays. None
of it makes a visitor say "wait, what was that?" out loud and reload to confirm.

There are three specific quiet gaps, each pointing at a system the site already
owns but is not yet using to its full expressive limit:

- The page looks **the same at noon as at midnight.** A site whose subject is
  photography — a craft about light — gives no acknowledgement of the visitor's
  own light. A photographer's portfolio that is colour-flat to the hour is a
  small missed signal.
- Clicking a row on the Projects index causes an **instant page swap** to the
  project page. The inline thumbnail the visitor just clicked is gone, replaced
  by an unrelated Mosaic grid. There is no felt continuity between "I picked
  this image" and "I am now inside this image's project."
- The Void's camera move is instantaneous-feeling: at any velocity, every frame
  remains pixel-sharp. The most photographic gesture in the medium — a long
  exposure dragging light along a motion vector — is absent from the surface
  that is literally a camera.

None of these are bugs a visitor would file. They are the difference between
"this is a portfolio" and "I have not seen a portfolio do that before."

## Solution

A three-phase pass that adds one award-caliber moment per phase, each reusing
a system the site already owns rather than bolting on foreign tech. The three
phases ship **independently** — independently shippable, independently
revertable — and are ordered by risk-adjusted wow so the cheap, low-risk wins
land first and warm up the thesis before the harder phases touch sensitive
machinery:

1. **The Hour (light-aware grade).** The page's **negative space** — the page
   `background` and the Void's clear colour — quietly responds to the visitor's
   device-local time of day: cooler near dawn, warmer low at dusk, near-mono at
   night. **Never lands on a photographic pixel** (no Mosaic image, no inline
   thumbnail, no Void frame). Pure CSS variable driven by a fixed 24-hour curve.
   No geolocation, no permission prompt, no network — consistent with the
   site's opt-in-only privacy posture.

2. **The Cover (index→Mosaic morph).** Clicking a Projects index row makes the
   clicked thumbnail **morph** — position, size, crop — through a brief
   full-bleed Cover on the project page, which then dissolves as the Mosaic
   settles underneath. The reverse plays on the browser back gesture *and* the
   floating back button. Built on the **cross-document** View Transition API,
   shipped as **pure progressive enhancement**: Chromium morphs; Safari/Firefox
   get today's instant navigation with no penalty and no polyfill.

3. **Shutter drag (Void long-exposure).** When the Void's camera moves fast,
   frames smear along their screen-space velocity vector — a depth-aware,
   directional long exposure — then resolve razor-sharp as the camera settles.
   Implemented as **extra texture taps inside the existing frame
   `ShaderMaterial`**: no `EffectComposer`, no new render pass, no restructure
   of the render loop (decisive given prior de-jank rollback history and the
   mobile frame budget).

All three phases keep their existing `prefers-reduced-motion` contracts intact,
are transform/opacity/CSS-variable only where they can be, freeze the brand
chrome (`--gold` and all UI accents) untouched, and are verified by on-device
visit — not by automated assertion. New vocabulary (**The Hour**, **The
Cover**, **Shutter drag**) is added to
[`CONTEXT.md`](CONTEXT.md) as glossary entries.

## User Stories

### The Hour

1. As a visitor arriving at dawn, I want the negative space around the work to
   read slightly cool, so the site quietly acknowledges the hour I'm seeing it
   in without saying anything.
2. As a visitor arriving at midday, I want the negative space to sit at a
   neutral, present "noon" reading, so the brightest hour reads as the brightest
   hour.
3. As a visitor arriving at dusk, I want the negative space to warm low, so the
   golden hour the site is about is acknowledged on the site itself.
4. As a visitor arriving at night, I want the page to fall toward near-monochrome,
   so the site recedes appropriately to the hour.
5. As a visitor of the Mosaic, I want **every photograph** to be colour-true at
   every hour of the day, so the work I am here to see is never tinted by the
   page around it.
6. As a visitor of the Projects index, I want each inline thumbnail to be
   colour-true at every hour, so the thumbnail is a faithful preview of the
   project, not a graded version of it.
7. As a visitor of the Void, I want every floating frame to be colour-true at
   every hour while only the empty depth around them shifts, so the
   photographs hold and only the *room* moves.
8. As a visitor of any page, I want the gold brand colour and every UI accent
   to be **identical** at every hour, so brand colour stays trustworthy.
9. As a visitor leaving a tab open across the day, I want the grade to update
   on its own as the hours pass, so a long-lingering tab does not stay frozen
   at the hour I opened it.
10. As a visitor who has not granted location, I want the site to **never** ask
    for my location to do this, so the wow does not cost me a permission prompt.
11. As a visitor on a low-bandwidth connection, I want no network call to set
    the grade, so the feature does not regress page weight or first paint.
12. As a visitor whose system requests `prefers-contrast: more`, I want the
    grade to **turn off** and the background to sit at a neutral, contrast-safe
    reading, so legibility is never traded for atmosphere.
13. As a visitor whose system requests `prefers-reduced-motion`, I want the
    grade to **still apply** (it is not motion), so reduced-motion does not
    disable a non-motion feature.

### The Cover

14. As a visitor on Chromium clicking a row on the Projects index, I want the
    **same image** I just clicked to morph — position, size, crop — into a
    brief full-bleed Cover on the project page, so the navigation reads as
    "this photo opened into its world" instead of as a page swap.
15. As a visitor watching the Cover, I want it to dissolve as the Mosaic
    settles underneath, so the entrance is a single continuous event rather
    than two cuts.
16. As a visitor on Chromium pressing the browser back gesture from a project
    page, I want the Cover to morph **back** into the originating index row
    I left from, so the reverse trip is as continuous as the forward one.
17. As a visitor on Chromium tapping the floating back button on a project
    page, I want the same reverse morph as the back gesture, so both ways
    back behave identically and predictably.
18. As a visitor on Safari or Firefox clicking a row, I want today's instant
    navigation with no broken visual artifacts and no console errors, so the
    feature degrades cleanly on browsers that don't yet support it.
19. As a visitor on any browser whose system requests `prefers-reduced-motion`,
    I want no morph and no Cover flash — straight navigation in both
    directions — so the reduced-motion contract is honoured.
20. As a visitor of a **film** project (where tile 1 is a video), I want the
    row to still morph into a Cover of the project's `thumbnail.webp`, so the
    Cover is the cover image independent of whether tile 1 happens to be a
    video.
21. As a visitor clicking different rows in succession, I want each row to
    morph into a Cover of **its own** image (not the previously-clicked row's),
    so the Cover always reflects what I actually clicked.
22. As a visitor on a long Projects list, I want the morph to work for any row
    regardless of scroll position, so the Cover is not tied to a hardcoded
    "first row" assumption.

### Shutter drag

23. As a visitor flicking the Void with a fast scroll or drag, I want the
    frames to smear along their motion direction, so the Void reads as a
    physical camera with a real shutter, not as an instantaneous slideshow.
24. As a visitor watching the smear, I want **nearer** frames to smear more than
    **far** frames, so the long exposure has real depth and reads as motion
    parallax rather than a flat screen blur.
25. As a visitor releasing the gesture, I want the smear to resolve **razor
    sharp** the instant the camera settles, so the smear reads as a long
    exposure resolving — not as a permanent softness.
26. As a visitor arriving at the site for the first time, I want the 3-second
    intro pull-back to streak heavily at the start and rack into focus exactly
    as the field settles, so the first thing I see is the photographic gesture
    of the medium.
27. As a visitor triggering The Reach, I want the smear to be inherited for
    free without any new code path, so the camera's signature moves all share
    one physics.
28. As a visitor triggering the Focus glide (clicking a frame), I want the
    smear to be inherited the same way, so every camera move on the site
    shares one feel.
29. As a visitor who has backgrounded the tab for ten seconds and returned,
    I want the first frame back to **not** explode into an absurd streak, so
    a tab resume doesn't produce a visible failure mode.
30. As a visitor whose system requests `prefers-reduced-motion`, I want the
    smear to be **off entirely** so the velocity-driven smear is never seen.
31. As a visitor on a mobile device, I want the smear's GPU cost reduced or
    removed entirely, so the Void's frame rate is held to the existing mobile
    budget that already disables antialias.
32. As a visitor of the existing render path (canvas `filter: contrast(1.05)`,
    antialias settings, existing intro timing), I want all of it unchanged, so
    the feature does not silently retune what already feels good.

### Cross-cutting

33. As a visitor of any reviewed-and-good area (Void's existing inputs, The
    Reach, the Spotlight, the Glissando, the living Mosaic, the Listing scrub),
    I want those surfaces unchanged, so this pass cannot regress them.
34. As an implementer reverting any single phase, I want the other two phases
    to continue working unchanged, so each phase is independently shippable and
    independently revertable.
35. As a future reader of the codebase, I want the three new terms (The Hour,
    The Cover, Shutter drag) defined in `CONTEXT.md`, so the vocabulary is
    durable.

## Implementation Decisions

- **Three phases, three reverts, no code coupling.** Each phase ships and
  reverts independently.

- **Phase order is risk-adjusted, not feature-priority.** The order is
  Hour → Cover → Shutter drag because (a) Hour and Cover are low-risk and
  warm up the "authored feel" thesis, (b) Shutter drag touches the
  de-jank-sensitive Three.js loop and goes after the cheap wins.

- **No new ADRs.** The trap-worthy decisions (The Hour's clock-only +
  negative-space-only; Shutter drag's shader-smear over post-process) get
  **inline guard comments** at the decision site, matching the
  `PRD-feel-polish.md` #1 precedent.

### Phase 1 — The Hour

- **Light source: device local clock only.** Sun position derived from a
  **fixed piecewise curve** over the 24-hour clock, computed from
  `new Date()`. No geolocation, no permission prompt, no network call. The
  approximation (clock-time rather than true solar time for the visitor's
  latitude/season) is invisible to a visitor and worth a permission prompt's
  weight saved.

- **One CSS custom property.** A single global `--hour-tint` drives the page
  `background`. Recomputed in JS at load and on a small interval (a few
  minutes) so a long-lingering tab crosses into the next part of the day
  without a per-frame waste. Per-frame drift is imperceptible.

- **Void scene background is the same curve.** The Void's Three.js scene
  background / clear colour is set from the same curve in the Three.js setup
  in `index.html`. The frame `ShaderMaterial` itself
  ([index.html:979](index.html:979)) is **untouched** — the grade lives in
  the empty depth, not in the frames.

- **Composes with, does not replace, the existing canvas filter.** The Void's
  canvas keeps `filter: contrast(1.05)`
  ([styles.css:532](styles.css:532)) — The Hour stacks on top of it.

- **Grade is hard-bounded to negative space only.** The grade must never land
  on a single photographic pixel: not Mosaic images, not inline thumbnails,
  not Void frames. The Void's canvas is not a neutral surface (it renders the
  frames, which are the work) so only the *space around* the frames is
  graded. Guard with an inline comment at the curve definition.

- **Magnitude is gentle.** A small temperature shift plus a small luminance
  change. Final numbers eyeballed on-device — the starting curve is
  cool-at-dawn → neutral-at-noon → warm-at-dusk → near-mono-at-night with
  no number greater than what the visitor would file as "tinted".

- **Brand chrome is frozen.** `--gold` and all UI accents are unchanged at
  every hour. Only the negative-space background animates.

- **Reduced-motion: not gated** (it is not motion).
  **`prefers-contrast: more`: grade off, neutral background.** Swing is also
  clamped to contrast-safe bounds at all hours so text/chrome legibility is
  preserved even in the default contrast mode.

### Phase 2 — The Cover

- **Cross-document View Transition API.** `projects.html` and `project.html`
  are separate documents ([index-render.js:44](index-render.js:44) links to
  `project.html?id=…`). Both pages opt in with
  `@view-transition { navigation: auto }` in CSS.

- **The Cover element is a transient full-viewport element on `project.html`
  showing the same `thumbnail.webp`** the visitor clicked. The row morphs
  into it (true same-image morph — the emotional point is "*this* photo
  opened into its world"), then the Cover dissolves as the Mosaic settles.
  The Cover exists only during entrance and is purely presentational.

  *Rejected alternative:* morphing into the first Mosaic tile as-is. The
  index thumbnail `thumbnail.webp` is **not** necessarily the first Mosaic
  tile `01.webp` — so the morph box would shift while the image content
  cross-faded to a *different* photo, quietly breaking the illusion.
  Rejected.

  *Rejected alternative:* forcing tile 1 to be the cover. Entangles the morph
  with the Manifest's media-order semantics, which are deliberately clean.
  Rejected.

- **One shared `view-transition-name`** (e.g. `project-cover`) assigned via
  `pageswap` / `pagereveal` events, keyed by the project `id`:
  - `pageswap` on `projects.html` names the clicked row's thumbnail.
  - `pagereveal` on `project.html` names the Cover.
  - Reverse (`project.html` → `projects.html`) uses `pageswap` on the project
    page to name the Cover, and `pagereveal` on the index page to name the
    row matching the `id` the visitor came from.

- **Reuse and extend the existing `kta:from-projects` flag** passed between
  pages ([project.html:12](project.html:12)) to carry the project `id` for the
  reverse trip.

- **Symmetric — works with both the browser back gesture and the floating
  back button.** The floating `.back-btn`
  ([project.html:39](project.html:39)) is a plain `<a href="projects.html">`.
  Both the back gesture and this anchor are forward navigations into the
  opted-in `projects.html`, so the same `pagereveal` naming on the index
  serves both.

- **Pure progressive enhancement, no polyfill.** Cross-document View
  Transitions are Chromium-only today. Safari/Firefox get today's instant
  navigation with no penalty. A hand-rolled GSAP cross-document morph
  (snapshot + FLIP across a full page load) is a large, fragile second
  implementation for a shrinking slice of visitors — explicitly out of scope.

- **Reduced-motion: no morph, no Cover, straight navigation.** Wrap the
  `::view-transition*` rules in `prefers-reduced-motion: no-preference`.

### Phase 3 — Shutter drag

- **Extend the existing frame `ShaderMaterial`** at
  [index.html:962](index.html:962) / [index.html:979](index.html:979) with a
  `uVelocity` uniform and a few extra texture taps along each frame's
  screen-space velocity vector. **No `EffectComposer`. No new full-screen
  pass.** The render path is untouched.

  *Rejected alternative:* full-screen `EffectComposer` motion-blur pass.
  Restructures the render path, costs a pass every frame, interacts with the
  existing antialias + `contrast(1.05)` pipeline. Highest risk to the render
  loop we've already had to roll back before (see the Reach v23 dejank
  regression). Held as the escalation path only if the shader smear doesn't
  read strongly enough.

  *Rejected alternative:* accumulation/feedback buffer. Needs a render
  target, ghosts dirtily, heavier. Rejected.

- **Velocity source: the unified camera lerp.** Derive the smear from
  `cam` vs the previous frame's `cam`, where `cam` already chases
  `camTarget` via the existing
  `cam.x += (camTarget.x - cam.x) * LERP_CAM` at
  [index.html:2070](index.html:2070). Because **every** input (scroll, drag,
  The Reach, the Focus glide, the intro) writes through this one channel,
  they all inherit the smear for free with no separate code paths per
  feature.

- **Per-frame velocity is clamped** (same spirit as the reel's
  `Math.min(dt, 50)` at [index.html:777](index.html:777)) so a stalled-tab
  resume or teleport cannot produce an absurd streak on the first frame
  back.

- **The intro is included.** The 3-second intro pull-back
  (`INTRO_FROM -34` → `INTRO_TO 26` at [index.html:1075](index.html:1075))
  is the fastest camera move on the site and the first thing a visitor sees.
  It streaks heavily at the start and dissolves to razor-sharp exactly as
  the field settles — "racking into focus." Self-limiting by construction:
  the smear *is* the velocity, which is highest at the start and zero at
  rest. Tune the intro's max smear conservatively so it reads as a long
  exposure resolving, not as a failed load.

- **Self-limiting cost.** At rest velocity ≈ 0, so the extra taps collapse
  to no visible cost. No "is it on?" toggle.

- **Reduced-motion: off entirely.** `uVelocity` held at 0 (or the taps
  compiled out via a `#define`). The smear is never seen.

- **Mobile (`IS_MOBILE`): fewer taps, or disabled, to protect the frame
  budget.** Mobile already disables antialias at
  [index.html:852](index.html:852); this matches that posture.

### Vocabulary

- **New `CONTEXT.md` glossary entries** for the three terms: The Hour,
  The Cover, Shutter drag. What they are, not how they're built.

## Testing Decisions

A good test for this pass means **observing the rendered behavior on a real
device, at the right time of day, on the right browser, with and without
reduced motion / contrast preferences**. Automated assertions on a CSS
property, a JS constant, or a uniform value would pass without proving the
thing that matters: that the Hour reads as light, the Cover reads as
continuity, and the smear reads as a shutter. The
site's standing practice (`PRD-feel-polish.md` "Testing Decisions") is the
precedent — verification is by visit, not by suite.

### The Hour (Phase 1)

- **Override device clock** (or stub the time input) to dawn, midday, dusk,
  and night. At each hour, confirm: the negative space shifts; every
  photograph (Mosaic, thumbnail, Void frame) is colour-true; and the gold
  brand colour is unchanged.
- **Long-lingering tab test.** Open the site, leave it open across an
  hour-boundary in the curve, confirm the grade updates without reload.
- **`prefers-contrast: more`** → grade off, neutral background, no
  legibility regression.
- **`prefers-reduced-motion: reduce`** → grade still applies (it is not
  motion).
- **No permission prompts and no network calls.** Confirm with browser
  devtools that loading the page does not request location and does not
  hit the network for the grade.

### The Cover (Phase 2)

- **Chromium happy path.** Click a row on `projects.html`; confirm the
  thumbnail morphs (position + size + crop) into a full-bleed Cover of the
  same image on `project.html`, then dissolves as the Mosaic settles.
- **Chromium reverse, back gesture.** From the project page, press the back
  gesture; the Cover morphs back into the originating row in the index.
- **Chromium reverse, floating back button.** Same project page, tap the
  floating `.back-btn`; same reverse morph as the back gesture.
- **Different rows.** Click row A, back, click row B — confirm each morph
  uses its own thumbnail and lands in its own row on return.
- **Safari & Firefox.** Click a row; navigation is instant, no broken
  layout, no console errors.
- **Reduced-motion (all browsers).** Instant navigation both directions,
  no Cover flash.
- **Film projects.** Open a project whose tile 1 is a video; confirm the
  row morphs into a Cover of the project's `thumbnail.webp` (not the
  video).

### Shutter drag (Phase 3)

- **Hard flick / scroll / drag.** Confirm frames streak along motion vector
  and snap razor-sharp at rest.
- **Depth-aware.** During a flick, confirm nearer frames smear more than
  far frames (real motion parallax).
- **Inheritance.** Trigger The Reach; trigger the Focus glide (click a
  frame). Both should inherit the smear with no separate code path.
- **Intro.** Reload to trigger the 3-second intro pull-back; confirm it
  streaks heavily at the start and racks into focus exactly as the field
  settles. Tune the intro max on-device.
- **Stalled-tab resume.** Background the tab for 10s, return; confirm no
  absurd streak on the first frame back (the clamp).
- **Reduced-motion.** Smear never seen.
- **Mobile.** Reduced-or-zero taps, frame rate held to the existing mobile
  budget.

### Cross-cutting

- **Independent reverts.** Revert each phase in isolation on a scratch
  branch and confirm the other two keep working unchanged.
- **Reviewed-and-good areas unchanged.** Visit each in turn — Void
  existing inputs, The Reach, the Spotlight, the Glissando, the living
  Mosaic, the Listing scrub — confirm no perceptible regression.

### Prior art

The site's `prefers-reduced-motion` fallbacks and the Mosaic / Spotlight /
Glissando layers were verified by visual inspection and on-device
demonstration rather than automated assertions. The de-jank work (see
[reach-safe-dejank-recipe](memory) and the v23 regression) was likewise
gated by on-device frame-rate observation, not unit tests. This pass
follows the same precedent — verification is by visit, not by suite.

## Out of Scope

- **Geolocation** or true solar time (latitude/season-aware sun position)
  for The Hour. Clock-only, by design.
- **Any GSAP/polyfill fallback** for The Cover on non-Chromium browsers.
  Pure progressive enhancement.
- **Grading any photographic pixel** under The Hour — no Mosaic image, no
  inline thumbnail, no Void frame. Negative space only.
- **A full-screen `EffectComposer` motion-blur pass** for Shutter drag —
  held as the escalation path only if the shader smear doesn't read
  strongly enough.
- **Any change to the Void's existing inputs**, The Reach, the Spotlight,
  the Glissando, the living Mosaic, or the Listing scrub.
- **Brand chrome (`--gold` and all UI accents) animation** under The Hour —
  frozen at every hour.
- **Splitting the vocabulary across multiple files / phases** — one glossary
  update to `CONTEXT.md`, done.

## Further Notes

- **De-jank history applies to Phase 3.** The Reach v23 attempt restructured
  the worker / COEP boundary and had to be rolled back to v22. Phase 3
  shipped as a shader-uniform extension on the *existing* `ShaderMaterial`
  is chosen specifically to avoid restructuring the render path. The
  full-screen `EffectComposer` pass — which *would* restructure it — is
  explicitly the escalation path, not the default.

- **Open follow-ups** (not in this pass):
  - Lock the eyeballed numbers on-device: The Hour's tint magnitude/curve,
    Shutter drag's tap count and intro max smear, The Cover's
    Cover-dissolve timing.
  - If Shutter drag's shader smear doesn't read strongly enough, re-open
    the post-process decision (mind the render-path risk).

- **Source of truth.** The full plan with file/line references, phase
  ordering rationale, hard constraints, and scenario walk-throughs lives in
  [`plan-wow-factor.md`](plan-wow-factor.md) and is the canonical reference
  for implementers. The three new terms live in [`CONTEXT.md`](CONTEXT.md).
