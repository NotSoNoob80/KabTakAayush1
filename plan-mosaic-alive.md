# Plan — The living Mosaic (alive-on-scroll depth pass)

## Goal

Make the **Mosaic** (a project's page, `project.html` / `mosaic.js`) feel
*alive* — like a place you move through, not a static document you scroll. The
photos should sit in **depth**, **land with weight** as you reach them, and the
whole sheet should carry the **momentum** of your scroll. Today, after the
opening assembly, scrolling the Mosaic is dead: every tile has already finished
its entrance off-screen and just sits there.

This is an **"alive" pass**, not a props pass. No literal skeuomorphism
(no sprockets, no paper). The lift comes from subtle, reactive depth — felt,
not announced.

## Hard constraints (locked via grill)

- **The Void is off-limits.** `index.html` and its WebGL field are not touched.
- **No sound.** The site stays silent; the lift is entirely visual.
- **No new per-frame Void cost** — irrelevant here since the Void isn't touched,
  but the same discipline applies to the Mosaic: one shared rAF writer that
  **pauses when nothing is moving** (see [v22 de-jank lesson](#why-this-cant-jank)).
- **Transform/opacity only.** Every effect is compositor-cheap; no layout
  thrash, no paint-heavy filters added.
- **Off under `prefers-reduced-motion`.** All three layers no-op; the page
  behaves exactly as it does today for those visitors.

## The three layers (named)

The Mosaic comes alive through three independent, composable layers. Each lives
on a **different DOM node** so their single `transform` properties don't clobber
each other:

| Layer | What it does | Lives on | Driven by |
|-------|--------------|----------|-----------|
| **Frame drift** | Each photo drifts *inside* its fixed frame | the `<img>`/`<video>` | cursor (desktop) / scroll (mobile) |
| **Tile settle** | Tiles scale 1.04→1 as they enter view | an inner wrapper | scroll-into-view |
| **Gate shear** | Whole grid shears sub-degree with scroll momentum | `.mosaic__grid` | scroll velocity |

### 1. Frame drift — depth without seams

The photos sit *behind glass*: the frame (`.mosaic__item`) never moves, so the
grid layout is fixed and **no seams can ever open** between tiles. Instead, the
`<img>`/`<video>` inside is slightly **overscanned** (a hair larger than its
frame, `overflow: hidden` on the frame) and drifts within that window.

- **Desktop:** the image drifts *toward the cursor* (both axes), easing toward
  its target — never snapping — and **decaying back to centre** when the pointer
  leaves the grid.
- **Mobile:** the image drifts *vertically with scroll position* (classic,
  gap-free parallax). No gyroscope, no permission prompt.
- **Depth variation:** each tile gets a small **deterministic** per-tile depth
  factor (seeded from its index, stable across renders) so the collage reads as
  varied depth rather than one flat sheet.
- **Magnitude:** a few pixels of overscan travel — felt, not seen. The overscan
  amount is sized to always exceed the max drift, so the frame is never exposed.

### 2. Tile settle — weight on arrival, reverse-scroll safe

The site *already* has a settle (`scale(1.04)` → `scale(1)`) — but only as a
one-shot **from-index intro** that animates **all** tiles up front, including
ones far below the fold ([script.js:432-486](script.js)). So below-fold tiles
finish settling off-screen and are static by the time you reach them. We extend
that exact motion into an ongoing, scroll-driven behaviour:

- **Split the intro (Q9=A).** The from-index radial assembly keeps its first
  screen exactly as-is, but **only animates first-screen tiles**. Every
  below-fold tile stays in its hidden pre-state (`opacity:0; scale(1.04)`) and is
  handed to the scroll observer. Side benefit: the intro stops animating dozens
  of invisible tiles, so it's cheaper and the chrome reveals sooner (the
  "furthest tile" timing keys off the first screen only).
- **One-shot per tile.** An `IntersectionObserver` settles each tile the first
  time it's seen, then **`unobserve`s it**. It never re-animates.
- **Reverse-scroll safe** (the explicit requirement):
  - *Touch flick down then back up* — passed tiles are already solid photos;
    scrolling back up shows them settled, no re-pop. iOS rubber-band overshoot
    can't re-trigger.
  - *Desktop wheel/trackpad up then down again* — already-settled tiles stay
    put; no slideshow flicker as they re-cross the viewport.
  - *Direction-agnostic* — the trigger fires on the first crossing from **either**
    edge, so anchor-jumps or fast flicks that bring an unseen tile in from any
    direction still settle it once.
- **Settle-before-centre:** a `rootMargin` nudge fires the settle slightly
  *before* the tile is comfortably in view, so you don't watch it animate under
  your nose — it's mostly resolved by the time you're looking at it.
- **Direct load / reload:** no intro; the observer drives every tile (on-screen
  tiles settle immediately on load, below-fold as reached).
- Reuses the existing `EASE = cubic-bezier(0.23, 1, 0.32, 1)` and durations, so
  it reads as *the same craft extended*, not a new effect.

### 3. Gate shear — momentum, kept subliminal

The quietest layer, and the first to remove if the page ever feels busy. The
whole grid shears as a single block, like film running through a gate.

- **Whole grid**, not per-tile (per-tile shear is busy and fights Frame drift).
- **Sub-degree:** ~0.4° at a normal scroll, hard-clamped to ~1.2° even on a
  violent flick. Felt, not seen.
- **Smoothed + clamped** scroll velocity so a hard touch-flick eases in instead
  of snapping; **decays to 0° at rest** within a few frames.
- Reverse scroll naturally shears the opposite way (mirrors momentum) — correct,
  no special-casing.

## Architecture

### DOM (small change in `mosaic.js`)

Each tile gains one thin wrapper so the three transforms have three homes:

```
figure.mosaic__item            ← fixed frame (overflow: hidden); no transform
  └── .mosaic__settle          ← NEW wrapper: owns Tile settle (scale)
        └── img / video        ← owns Frame drift (translate, overscanned)
.mosaic__grid                  ← owns Gate shear (skew)
```

- The intro's scale move shifts from `figure` down to `.mosaic__settle` (one
  level), so settle and drift never share a node.
- Video tiles get the identical wrapper and treatment as photo tiles.

### One shared rAF writer (the jank-safety contract)

A single `requestAnimationFrame` loop owns **all** transform writes for all
three layers. It:

- Reads input once per frame (pointer target, `scrollY`, derived velocity).
- Eases (lerps) the cursor-drift target and the shear target toward their goals.
- Writes each layer's transform to its node.
- **Stops itself** when everything is at rest: pointer outside the grid *and*
  scroll velocity ≈ 0 *and* drift decayed to centre. Re-armed on the next
  `pointermove` over the grid or `scroll`.

No per-layer timers, no competing rAFs, no work while the page is idle.

## Why this can't jank

Your own history (the v23 de-jank rework that was rolled back to v22) says the
safe path is *less* per-frame work, gated tightly. This plan honours that:

- One rAF, not three; it **sleeps when idle**.
- Transform/opacity only — no layout, no new filters, no paint-heavy work.
- Frame drift is bounded to a few pixels; Gate shear to a fraction of a degree.
- The Void — the actual fragile surface — is not touched at all.

## Naming → `CONTEXT.md`

Three glossary terms are added (done inline with this plan): **Frame drift**,
**Tile settle**, **Gate shear**, with **the living Mosaic** as the umbrella.

## Scenarios / edge cases to honour

- **Reverse scroll (touch & cursor)** — already-settled tiles never re-animate
  (one-shot + `unobserve`); covered above.
- **Reduced motion** — all three layers off; intro already no-ops; page is
  byte-for-byte today's behaviour.
- **Pointer leaves the grid** — Frame drift decays to centre; the rAF then
  sleeps. No tile left mid-drift.
- **Video tiles** — same wrapper, same drift/settle; playback IO behaviour
  ([mosaic.js:107](mosaic.js)) unchanged.
- **Film-only stack layout** (`mosaic__grid--film`) — all three layers apply
  equally; nothing assumes the 3-column grid.
- **Direct load vs from-index** — intro path animates first screen only; direct
  load uses the observer throughout. Both end in the same settled state.
- **Overscan never exposes the frame** — overscan amount > max drift, always.

## Out of scope

- The Void (`index.html`) — untouched, by hard constraint.
- Any sound.
- Gyroscope / device-orientation parallax (rejected: second sensor permission).
- The Loupe / lift-on-approach / cursor-attention effects (considered, cut to
  keep two reactive layers, not four).
- Sprockets, paper texture, page transitions (rejected as literal props).
- The Projects index and the Listing — this pass is Mosaic-only.

## Verification

- **Desktop, pointer:** move the cursor over the Mosaic — photos drift in their
  frames toward the cursor, ease back to centre on leave. No seams between tiles
  at any cursor position.
- **Desktop, scroll down then up:** tiles settle once on first view; scrolling
  back up shows no re-pop; the grid shears sub-degree on fast scroll and returns
  flat at rest.
- **Touch, flick down then back up:** no re-settle, no flicker; images drift
  vertically with scroll; grid shear eases in/out without snapping on a hard
  flick.
- **From-index navigation:** the radial first-screen assembly looks as it does
  today; below-fold tiles settle as reached, not before.
- **Reduced motion:** none of the three layers run; page identical to today.
- **Idle:** confirm (DevTools Performance) the rAF loop is *not* running when the
  pointer is off the grid and scrolling has stopped.
- **Film-only project:** the single-column stack also drifts/settles/shears.

## Open follow-up (not in this pass)

- An ADR may be earned for the **intro split** (first-screen-only assembly +
  observer hand-off) — it's mildly surprising to a future reader ("why does the
  intro only animate the first screen?") and is a real trade-off. Offered, not
  yet written.
