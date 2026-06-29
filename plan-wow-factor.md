# Plan — Wow-Factor Pass (The Hour · The Cover · Shutter drag)

A three-feature roadmap of new, award-caliber moments for the site. Each feature
reuses a system the site **already owns** rather than bolting on foreign tech —
the time-of-day instinct, cross-document navigation, and the Void's camera loop.
The three ship as **three independent phases**, ordered by risk-adjusted wow,
each independently shippable and independently revertable.

This file is the canonical implementer reference. Vocabulary for the three new
terms lives in [`CONTEXT.md`](CONTEXT.md).

## Phase order & rationale

| Phase | Feature | Term | Risk | Why here |
|---|---|---|---|---|
| 1 | Light-aware grade | **The Hour** | Low | Pure CSS variable + a time curve; touches no motion machinery. Warms up the "authored feel" thesis first. |
| 2 | Index→Mosaic morph | **The Cover** | Low | Native, progressive, biggest perceived-quality jump per unit effort. |
| 3 | Void long-exposure | **Shutter drag** | Medium | Touches the Three.js render loop — the de-jank-sensitive zone — so it goes after the cheap wins. |

Each phase keeps its own `prefers-reduced-motion` contract intact, is
transform/opacity/CSS-variable only where it can be, and is verified by
on-device observation (the site's standing practice — see
`PRD-feel-polish.md` "Testing Decisions"), not by automated assertion.

---

## Phase 1 — The Hour (light-aware grade)

### Intent
The site quietly responds to the visitor's local time of day: the **negative
space** cools toward dawn, warms low at dusk, and goes near-monochrome at night.
It says "made by someone who thinks about light" without a word.

### Hard rule — the work is never regraded
The grade lives **only in the negative space**: the page `background` and the
Void's empty depth (its Three.js scene background / clear colour). It must never
land on a single photographic pixel — **not** the Mosaic images, **not** the
inline thumbnails, and **not** the floating frames in the Void. Every photograph
holds true colour at every hour. (This is the resolution of the "C — work shown
true" choice: the Void canvas is not a neutral surface; it renders the frames,
which are the work, so only the *space around* the frames is graded.)

### Light source — clock only, no geolocation
The sun position is derived from **device local time** via a fixed piecewise
curve over the 24-hour clock. **No geolocation**, no permission prompt, no
network — consistent with the site's opt-in-only privacy posture (a location
prompt on arrival would be as off-brand as auto-enabling The Reach). The
approximation (clock-time, not true solar time for the visitor's latitude/season)
is invisible to a visitor.

### Implementation notes
- One global CSS custom property (e.g. `--hour-tint`) drives the page
  `background`. Computed in JS on load and **recomputed every few minutes** (a
  small interval) so a long-lingering or left-open tab crosses into the next part
  of the day; a continuous per-frame drift is imperceptible and wasteful.
- The Void's scene background / clear colour is set from the same curve in the
  Three.js setup (`index.html`), leaving the frame `ShaderMaterial`
  ([index.html:979](index.html:979)) **untouched**.
- Magnitude is gentle — a temperature shift plus a small luminance change.
  Final numbers eyeballed on-device.
- It composes with, does not replace, the existing canvas `filter: contrast(1.05)`
  ([styles.css:532](styles.css:532)).

### Accessibility contract
- **Not** gated by `prefers-reduced-motion` (it is not motion).
- **Disabled under `prefers-contrast: more`**, and the swing is clamped to
  contrast-safe bounds at all hours so text/chrome legibility never degrades.
- Brand chrome (`--gold` and all UI accents) is **frozen** — only the negative
  space moves, so the brand colour stays trustworthy.

### Verification
- Override the device clock (or stub the time input) to dawn / midday / dusk /
  night and confirm the negative space shifts while every photograph — Mosaic,
  thumbnail, Void frame — stays colour-true.
- Confirm chrome/gold is unchanged across all hours.
- `prefers-contrast: more` → grade off, neutral background.

---

## Phase 2 — The Cover (index→Mosaic view-transition morph)

### Intent
Clicking a row on the Projects index makes the image you clicked **open into its
project**: the inline thumbnail morphs — position, size, crop — into a brief
full-bleed **Cover** on the project page, which then dissolves as the Mosaic
settles underneath. The reverse plays on the way back.

### Mechanism — cross-document View Transitions
`projects.html` and `project.html` are **separate documents**
([index-render.js:44](index-render.js:44) links to `project.html?id=…`), so this
is the **cross-document** View Transition API, opted in via
`@view-transition { navigation: auto }` in the CSS of both pages.

### The Cover element
A transient full-viewport element on `project.html` showing the **same**
`thumbnail.webp` the visitor clicked. The row morphs into it (a true same-image
morph — the emotional point is "*this* photo opened into its world"), then the
Cover dissolves/recedes as the Mosaic grid settles. The Cover is purely
presentational and exists only during entrance.

*Rejected alternatives:* morphing into the first Mosaic tile as-is (the index
thumbnail `thumbnail.webp` ≠ the first tile `01.webp`, so the box would morph
while the image content cross-faded to a *different* photo — quietly breaks the
illusion); and forcing tile 1 to be the cover (entangles the morph with the
Manifest's media-order semantics, kept deliberately clean).

### Naming the morph pair
Only one element per `view-transition-name` may exist at a time. Assign a single
shared name (e.g. `project-cover`) via the `pageswap`/`pagereveal` events, keyed
by the project `id`:
- **Outgoing** (`pageswap` on `projects.html`): name the clicked row's
  thumbnail.
- **Incoming** (`pagereveal` on `project.html`): name the Cover.

Reuse/extend the existing `kta:from-projects` flag passed between the pages
([project.html:12](project.html:12)) to carry the `id` for the reverse trip.

### Symmetric & works with the floating back button
The reverse morph (project → index) fires for **both** the browser back gesture
**and** the floating `.back-btn` ([project.html:39](project.html:39), a plain
`<a href="projects.html">`). Both are forward navigations into the opted-in
`projects.html`; on `pagereveal` there, name the row matching the `id` we left
from, so the Cover morphs back into the correct row in both cases.

### Browser support — progressive enhancement, no fallback
Cross-document View Transitions are **Chromium-only** today. Ship as **pure
progressive enhancement**: supported browsers morph; Safari/Firefox get today's
instant navigation with **no penalty and no polyfill**. A hand-rolled GSAP
cross-document morph (snapshot + FLIP across a full page load) is a large,
fragile second implementation for a shrinking slice of visitors — explicitly out
of scope. Non-Chromium visitors lose nothing they have today.

### Accessibility contract
- Under `prefers-reduced-motion`: **no morph and no Cover** — straight
  navigation. Wrap the `::view-transition*` rules in the motion media query.

### Verification
- Chromium: click a row → thumbnail morphs into a full-bleed Cover of the same
  image → Cover dissolves into the Mosaic. Back gesture **and** floating back
  button → Cover morphs back into the originating row.
- Safari/Firefox: navigation is instant, nothing visually broken, no console
  errors.
- `prefers-reduced-motion`: instant nav both directions, no Cover flash.
- Film projects: the row still morphs into a Cover of the project's
  `thumbnail.webp` (the Cover is the cover image, independent of whether tile 1
  is a video).

---

## Phase 3 — Shutter drag (Void long-exposure)

### Intent
When the Void's camera moves fast, the frames smear along their screen-space
velocity vector — a directional **long exposure** — then resolve razor-sharp as
the camera settles. The photographic gesture of dragging the shutter, expressed
as the literal physics of the camera you fly.

### Mechanism — per-frame shader smear (no new render pass)
Extend the **existing** frame `ShaderMaterial`
([index.html:962](index.html:962), [index.html:979](index.html:979)) with a
`uVelocity` uniform and a few extra texture taps along each frame's screen-space
velocity vector. **No `EffectComposer`, no new full-screen pass** — the render
path is untouched (decisive given the de-jank rollback history *and* the mobile
budget, which already disables antialias at [index.html:852](index.html:852)).

The smear is **depth-aware**: nearer frames smear more than far ones (real motion
parallax), which a flat full-screen blur could not express.

*Rejected alternatives:* full-screen `EffectComposer` motion-blur pass
(restructures the render path, costs a pass every frame, interacts with the
existing antialias + `contrast(1.05)` pipeline — highest risk to the loop we've
had to roll back before; noted only as the escalation path if the shader smear
doesn't read strongly enough); accumulation/feedback buffer (needs a render
target, ghosts dirtily, heavier).

### Velocity source — unified & clamped
Derive the smear from the unified camera velocity: `cam` vs the previous frame's
`cam`, where `cam` already chases `camTarget` via
`cam.x += (camTarget.x - cam.x) * LERP_CAM` ([index.html:2070](index.html:2070)).
Because **every** input (scroll, drag, The Reach, the Focus glide, the intro)
writes through this one channel, they all inherit the smear for free. Clamp the
per-frame velocity (same spirit as the reel's `Math.min(dt, 50)` at
[index.html:777](index.html:777)) so a stalled-tab resume or teleport cannot
produce an absurd streak.

### The intro streaks
The 3-second intro pull-back (`INTRO_FROM -34` → `INTRO_TO 26`,
[index.html:1075](index.html:1075)) is the fastest camera move on the site and
the first thing a visitor sees. It is **included**: it streaks heavily at the
start of the pull and dissolves to razor-sharp exactly as the field settles —
"racking into focus." Tune the intro's max smear conservatively so it reads as a
long exposure resolving, not as a failed load. (Self-limiting by construction:
the smear *is* the velocity, which is highest at the start and zero at rest.)

### Self-limiting cost
At rest velocity ≈ 0, so the extra taps collapse to no visible cost and there is
no "is it on?" toggle to manage.

### Accessibility & device contract
- **Off entirely under `prefers-reduced-motion`** (`uVelocity` held at 0, or the
  taps compiled out).
- **Mobile** (`IS_MOBILE`): fewer taps, or disabled, to protect the frame
  budget.

### Verification
- Flick/scroll/drag the Void hard → frames streak along motion and snap sharp at
  rest; near frames drag more than far (depth-aware).
- The Reach and the Focus glide inherit the smear with no separate code.
- Intro pull-back streaks then racks into focus; tune the max on-device.
- Background the tab 10s, return → no absurd streak on the first frame (clamp).
- `prefers-reduced-motion` → no smear ever. Mobile → reduced/zero taps, frame
  rate held.

---

## Cross-cutting decisions

- **Three phases, three reverts.** No phase depends on another at the code
  level.
- **No new ADRs.** The trap-worthy decisions (The Hour clock-only +
  negative-space-only; Shutter drag shader-smear vs post-process) get
  **inline guard comments** at the decision site, matching the
  `PRD-feel-polish.md` #1 precedent.
- **New vocabulary** (The Hour, The Cover, Shutter drag) added to
  [`CONTEXT.md`](CONTEXT.md) as glossary entries — what they are, not how they're
  built.
- **Verification is by visit, not by suite** — these are perceptual and
  frame-rate / time-of-day dependent; automated assertions on a CSS property or a
  JS constant would pass without proving the thing that matters.

## Out of scope

- Geolocation / true solar time for The Hour.
- Any GSAP/polyfill fallback for The Cover on non-Chromium browsers.
- Grading any photographic pixel (Mosaic, thumbnails, Void frames) under The Hour.
- A full-screen `EffectComposer` motion-blur pass for Shutter drag (escalation
  path only).
- Any change to the Void's existing inputs, The Reach, the Spotlight, the
  Glissando, the living Mosaic, or the Listing scrub.

## Open follow-ups

- Lock the eyeballed numbers on-device: The Hour's tint magnitude/curve, Shutter
  drag's tap count + intro max smear, The Cover's Cover-dissolve timing.
- If Shutter drag's shader smear doesn't read strongly enough, evaluate the
  full-screen pass (re-open the decision; mind the render-path risk).
