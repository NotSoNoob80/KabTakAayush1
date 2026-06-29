# 0014 — Shutter drag grows light-trails via a bounded lighten (max), not additive accumulation

- Status: Accepted
- Date: 2026-06-29

## Context

**Shutter drag** ([CONTEXT.md](../../CONTEXT.md)) smears each Void **frame** along
its screen-space velocity and resolves sharp at rest. The original mechanism is a
per-frame, in-shader tap blur that **averages** its taps — an energy-conserving
motion blur, normalised by total weight
([index.html](../../index.html), fragment shader of the frame `ShaderMaterial`).

Averaging is correct motion blur, but it *dilutes* highlights: a bright point in a
photo (a lamp, a sun-glint, a bright sky edge) spreads its energy across the
streak and so gets **darker** as it smears. Real long-exposure photography does
the opposite — light **accumulates** over the exposure, so a moving highlight
leaves a *brighter* trail. The brief was to make Void frames streak light the way
a long exposure does, on top of a longer overall smear.

This sits on the render loop the project has rolled back before (see the de-jank
memory and [plan-wow-factor.md](../../plan-wow-factor.md), which fences a
full-screen `EffectComposer` motion-blur pass as **out of scope / escalation
path only**). So the bright term had to stay inside the existing shader, add no
render pass, and not be able to misfire into a rendering-bug look.

## Decision

Add a **light-trail term inside the existing frame shader** — no new pass — built
as a **lighten (per-channel `max`) blend** across the same velocity taps, gated to
highlights by luma and mixed over the averaged motion blur:

```glsl
vec3 bright = max(c0, max(max(cm1, cp1), max(cm2, max(cp2, max(cm3, cp3)))));
float blum  = dot(bright, vec3(0.299, 0.587, 0.114));
float g     = smoothstep(0.6, 1.0, blum) * 0.7;   // 0.6 highlight floor, 0.7 strength
col         = mix(col, max(col, bright), g);
```

The smear itself is also lengthened (gains `XY 0.018→0.040`, `Z 0.0028→0.0060`)
and the tap count raised `5→7` so the longer streak stays smooth instead of
banding into discrete ghosts.

## Consequences

- **Bounded by construction.** A trail can never exceed the brightest *source*
  texel, so it cannot blow past white — the same self-limiting ethos the rest of
  Shutter drag relies on. No tone-mapping or clipping logic to maintain.
- **Motion-gated for free.** At rest all taps coincide, so `bright == col` and the
  `mix` is a no-op — no "is it on?" toggle, no cost when still.
- **Highlight-selective.** Midtones stay pure motion blur; only true highlights
  trail. The effect is therefore *vivid on some frames and absent on others*,
  depending on whether a given photo has point highlights — authentic to long
  exposure, but not a uniform global look.
- **Device contract unchanged.** Still compiled out under `prefers-reduced-motion`
  and on mobile (`SHUTTER_DRAG_ENABLED`), so the extra `max`/`dot`/`smoothstep`
  only ever run on desktop.

## Alternatives considered

- **Additive accumulation** (literal photon pile-up): the most physically faithful
  light trail, but **clips to white** and reads as a rendering bug on already-bright
  frames; would need explicit tone control. Rejected for the bounded `max`, which
  gets most of the look with none of the blow-out risk.
- **Full-screen `EffectComposer` motion/bloom pass**: restructures the render path
  the project has rolled back before, costs a pass every frame. Already fenced out
  by [plan-wow-factor.md](../../plan-wow-factor.md); not re-opened.
- **Leave Shutter drag as pure averaging** and just lengthen the smear: simplest,
  but can never produce light-trails — the whole point of this change.
