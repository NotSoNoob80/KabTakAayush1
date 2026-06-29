# Phase 1 — The Hour — Issue List

Source: [`PRD-wow-factor.md`](../PRD-wow-factor.md) §"Phase 1 — The Hour".
Plan: [`plan-wow-factor.md`](../plan-wow-factor.md).

Three vertical slices, dependency-ordered. Each is independently demoable and
independently revertable. Slice 1.3 is HITL (on-device feel pass); 1.1 and 1.2
are AFK.

---

## Issue 1.1 — Page-wide hour-tint on negative space

**Type:** AFK
**Blocked by:** None — can start immediately

### What to build

A single global CSS custom property `--hour-tint` drives the page `background`
on every non-Void page (Projects index, project pages outside the Mosaic
canvas region, About). The value is computed in JS from `new Date()` against
a fixed piecewise curve over the 24-hour clock — cool near dawn, neutral at
noon, warm low at dusk, near-mono at night — and recomputed on a small
interval (a few minutes) so a long-lingering tab crosses hour boundaries
without per-frame waste.

Hard guarantees:

- **Never lands on a photographic pixel.** Not Mosaic images, not inline
  thumbnails, not any photograph. Only the page negative space.
- **Brand chrome is frozen.** `--gold` and every UI accent are byte-identical
  at every hour.
- **No geolocation, no permission prompt, no network call.** Clock-only.
- **`prefers-contrast: more` disables the grade** and pins the background to
  a neutral, contrast-safe reading.
- **`prefers-reduced-motion` does NOT gate this** — it is not motion.

Inline guard comment at the curve definition stating: "negative space only;
never lands on a photographic pixel; brand chrome frozen."

### Acceptance criteria

- [ ] Loading any non-Void page sets `--hour-tint` from a clock-driven curve
- [ ] Background visibly differs between dawn / noon / dusk / night when the
      device clock is overridden
- [ ] Every inline thumbnail on the Projects index is colour-true at every
      simulated hour (no tint bleed onto the image)
- [ ] `--gold` and every UI accent are unchanged at every simulated hour
- [ ] A tab left open across an hour boundary in the curve updates without
      reload
- [ ] DevTools shows **no** geolocation prompt and **no** network call
      attributable to the grade
- [ ] `prefers-contrast: more` → grade off, neutral background, no
      legibility regression
- [ ] `prefers-reduced-motion: reduce` → grade still applies

### Blocked by

- None — can start immediately

---

## Issue 1.2 — Void scene clear color follows the same curve

**Type:** AFK
**Blocked by:** Issue 1.1

### What to build

The Void's Three.js scene background / clear colour is driven by the same
24-hour curve as `--hour-tint`, set in the Three.js setup in `index.html`.
The grade lives in the **empty depth around the frames** — the frame
`ShaderMaterial` at `index.html:979` is **untouched**.

Composition rule: the Void's canvas keeps its existing
`filter: contrast(1.05)` (`styles.css:532`). The Hour stacks on top of it;
it does not replace it.

Inline guard comment at the Three.js scene-background assignment stating:
"frames are the work; only the room moves. Do not touch the frame shader."

### Acceptance criteria

- [ ] Void scene clear color visibly differs between dawn / noon / dusk /
      night when the device clock is overridden
- [ ] Every floating frame in the Void is colour-true at every simulated
      hour (the photographs do not tint with the room)
- [ ] The frame `ShaderMaterial` at `index.html:979` is unchanged in this
      slice's diff
- [ ] The canvas `filter: contrast(1.05)` rule at `styles.css:532` is
      unchanged in this slice's diff
- [ ] Void existing inputs (scroll, drag, intro, The Reach, Focus glide,
      Spotlight) behave exactly as today
- [ ] `prefers-contrast: more` → Void clear color pinned to neutral
- [ ] `prefers-reduced-motion: reduce` → grade still applies (it is not
      motion)

### Blocked by

- Issue 1.1

---

## Issue 1.3 — On-device tuning + glossary entry

**Type:** HITL
**Blocked by:** Issue 1.1, Issue 1.2

### What to build

On-device feel pass to lock the curve's magnitudes. The starting curve from
1.1/1.2 is intentionally a placeholder; final numbers are eyeballed on a
real device at real hours of day. Per the PRD: "no number greater than what
the visitor would file as 'tinted'."

Lock in:

- Dawn / noon / dusk / night anchor values for hue and luminance shift
- Interpolation shape between anchors (the piecewise curve)
- Contrast-safe clamp bounds verified at the extremes

Then add a glossary entry for **The Hour** to `CONTEXT.md` — *what it is,
not how it's built* — matching the existing glossary tone.

### Acceptance criteria

- [ ] Curve magnitudes reviewed at dawn, noon, dusk, and night on a real
      device (record the device + hours in the PR description)
- [ ] No anchor crosses what a visitor would call "tinted"
- [ ] Mosaic, thumbnails, and Void frames remain colour-true at every locked
      anchor
- [ ] `--gold` and accents remain byte-identical at every locked anchor
- [ ] Text contrast on background remains AA-compliant at the most extreme
      hour of the locked curve
- [ ] `CONTEXT.md` has a new **The Hour** glossary entry describing the
      feature (not the implementation)

### Blocked by

- Issue 1.1
- Issue 1.2
