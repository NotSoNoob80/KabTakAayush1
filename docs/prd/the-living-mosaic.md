# PRD — The living Mosaic (alive-on-scroll depth pass)

## Problem Statement

A visitor opens a project. The **Mosaic** assembles beautifully — the
from-index radial entrance lands, the chrome reveals, the collage is
present. Then they start to scroll, and the page goes *dead*. Every
**tile** has already finished its entrance off-screen, so below-fold
photos just sit there as a static document. The reactive feel of the
opening is gone the moment the visitor moves past the first screen.

The Mosaic is supposed to be the brand's editorial high-water mark — the
place where a project's photos breathe — and right now it is the most
*inert* page on the site. The **Void** moves under you, the **Listing**
scrubs under your scroll, the Projects index reveals colour under your
pointer — and then you click into a project and the photos behave like a
PDF.

The gap is not "the entrance should be louder." The entrance is fine.
The gap is that scrolling the Mosaic carries no weight — no depth, no
settle-on-arrival, no sense the sheet has momentum behind it.

## Solution

Bring the Mosaic alive with **three reactive layers** that compose into
one umbrella, **the living Mosaic**. Each layer is small, transform/
opacity only, and named so it can be discussed, tuned, or removed
independently:

- **Frame drift** — each photo drifts *inside* its fixed **frame** (the
  frame never moves, so the grid layout is fixed and no seams ever open
  between tiles). The `<img>` / `<video>` is slightly overscanned and
  shifts toward the cursor on desktop, or with scroll position on
  mobile, by a small **deterministic per-tile** amount. The collage
  reads as varied depth rather than one flat sheet — photos behind glass
  you lean to look around.
- **Tile settle** — the existing `scale(1.04) → scale(1)` settle that
  the from-index intro already uses, extended to be *ongoing and
  scroll-driven*. Each below-fold tile waits in its hidden pre-state
  and settles once, the first time it crosses into view from either
  edge, and never re-animates. The same easing and durations the intro
  already uses — so it reads as the same craft extended, not a new
  effect.
- **Gate shear** — the whole grid shears sub-degree (≈0.4° at a normal
  scroll, hard-clamped to ~1.2° on a violent flick) with scroll
  velocity, then decays back to flat at rest. A film *gate* nod — the
  quietest of the three, and the first to remove if the page ever feels
  busy.

All three layers ride on **one shared `requestAnimationFrame` writer**
that **sleeps when nothing is moving**, honouring the v22/v23 de-jank
lesson: less per-frame work, gated tightly. The **Void** — the actual
fragile surface — is not touched. Under `prefers-reduced-motion` all
three layers no-op and the page behaves byte-for-byte as today.

The new vocabulary — **the living Mosaic**, **Frame drift**,
**Tile settle**, **Gate shear** — is already written into `CONTEXT.md`
alongside the existing glossary.

## User Stories

1. As a visitor on a project page, I want the Mosaic to feel like a
   place I move through rather than a static document, so that the
   reactive feel of the rest of the site does not vanish the moment I
   click into a project.
2. As a desktop visitor moving my cursor across the Mosaic, I want each
   photo to drift *inside* its frame toward my cursor, so that the
   collage reads as varied depth, like photos behind glass.
3. As a desktop visitor, I want the drift to ease toward my cursor
   rather than snap to it, so that the motion never reads as cheap or
   jittery.
4. As a desktop visitor who has moved my pointer off the grid, I want
   every photo to decay back to centre, so that no tile is left mid-
   drift and the sheet returns to a calm rest state.
5. As a mobile visitor scrolling the Mosaic, I want each photo to drift
   *vertically* with scroll position inside its frame (classic
   gap-free parallax), so that mobile scrolling carries the same
   sense of depth as the desktop cursor.
6. As a mobile visitor, I want this without a gyroscope or device-
   orientation permission prompt, so that opening a project never asks
   me to grant a second sensor.
7. As a visitor on any device, I want the photo's drift to *never*
   expose the frame edge — the overscan margin must always exceed the
   maximum drift — so that I never see a seam open between tiles.
8. As a visitor, I want each tile's drift to use a small per-tile depth
   factor that is **deterministic from the tile's index** (stable
   across renders), so that the collage reads as varied depth rather
   than one flat sheet *and* a re-render does not reshuffle which
   photo drifts most.
9. As a visitor scrolling down past tiles that were below the fold, I
   want each tile to settle (scale 1.04 → 1, fade in) the first time
   it crosses into view, so that the entrance feel of the first
   screen extends naturally to the rest of the project.
10. As a visitor, I want a tile to settle *slightly before* it is
    comfortably in view, so that I am not watching it animate under my
    nose — it is mostly resolved by the time I am looking at it.
11. As a visitor flicking the page up and back down (touch), I want
    already-settled tiles to stay solid photos as they re-cross the
    viewport, so that the page does not flicker like a slideshow as
    iOS rubber-banding bounces me past them again.
12. As a desktop visitor scrolling down then back up with the wheel or
    trackpad, I want already-settled tiles to never re-pop, so that the
    arrival reaction is the one-shot per tile the brand expects.
13. As a visitor whose first encounter with a tile happens from the
    *bottom* edge (anchor jump, fast scroll-up, hash navigation), I
    want that tile to still settle once on first crossing, so that the
    reaction is direction-agnostic — not tied to scrolling down.
14. As a visitor who arrives at a project by **direct load or reload**
    (no from-index intro), I want every on-screen tile to settle
    immediately on load and every below-fold tile to settle as I reach
    it, so that the same arrival weight applies whether or not I came
    through the index.
15. As a visitor coming **from the index** with the radial assembly, I
    want only the first-screen tiles to participate in that radial
    intro, and every below-fold tile to wait for me, so that the intro
    is not wastefully animating tiles I cannot see *and* the chrome
    reveals sooner (the "furthest tile" timing keys off the first
    screen only).
16. As a visitor scrolling the Mosaic with momentum, I want the whole
    grid to shear sub-degree with my scroll velocity, so that the
    sheet carries the **weight** of my scroll rather than feeling
    weightless.
17. As a visitor flicking violently, I want the shear to be hard-
    clamped well below a degree or two, so that the effect is felt,
    not seen — never a tilt I can name.
18. As a visitor reversing my scroll direction, I want the shear to
    naturally mirror in the opposite direction, so that the momentum
    cue tracks my actual motion rather than special-casing.
19. As a visitor who has stopped scrolling, I want the shear to decay
    back to flat within a few frames, so that the Mosaic at rest is
    visually quiet.
20. As a visitor on a film-only project (single-column stack), I want
    Frame drift, Tile settle, and Gate shear to apply equally to the
    stack, so that nothing about the living Mosaic assumes the three-
    column grid.
21. As a visitor watching a video tile, I want the wrapper / drift /
    settle treatment to be identical to a photo tile, and the existing
    play/pause-by-IntersectionObserver behaviour to be unchanged, so
    that videos weave into the living Mosaic without becoming a
    second-class case.
22. As a visitor with `prefers-reduced-motion`, I want all three
    layers to no-op and the page to behave exactly as it does today,
    so that the existing reduced-motion posture is not broken.
23. As a visitor whose pointer is off the grid and whose scroll has
    settled, I want the rAF loop to actually stop running, so that
    the page is doing zero per-frame work when nothing is moving —
    the same discipline the v22/v23 de-jank work earned.
24. As a visitor on a project page, I want the **Void** to be
    untouched by this change, so that the homepage's fragile WebGL
    surface keeps its established performance budget.
25. As a future maintainer reading the code, I want **the living
    Mosaic**, **Frame drift**, **Tile settle**, and **Gate shear**
    in `CONTEXT.md`, so that the three named layers can be discussed,
    tuned, or removed independently. (Done inline with the plan.)
26. As a future maintainer, I want an ADR considered for the
    **intro split** — first-screen-only radial assembly with the
    observer owning the rest — since it is a real trade-off
    ("why does the intro only animate the first screen?") rather
    than an invisible refactor.

## Implementation Decisions

### Three layers, three DOM homes (single transform per node)

Each tile gains one thin wrapper so each of the three transforms has
its own node and the layers never clobber each other's `transform`
property:

- `figure.mosaic__item` — the fixed **frame**; `overflow: hidden`; no
  transform of its own; owns the grid cell.
- `.mosaic__settle` — a NEW wrapper inside the figure; owns
  **Tile settle** (the `scale` move).
- `<img>` / `<video>` — owns **Frame drift** (the `translate`,
  drifting inside the overscan margin).
- `.mosaic__grid` — owns **Gate shear** (the `skew`).

`mosaic.js` emits the `.mosaic__settle` wrapper for both image and
video tiles. The from-index intro's scale move shifts from `figure`
down to `.mosaic__settle`, so settle and drift never share a node.

### Frame drift — depth without seams

- The image is **overscanned** inside its frame (a hair larger than
  its frame box; the frame has `overflow: hidden`).
- **Desktop:** the image drifts on both axes toward the cursor's
  offset from the tile's centre, eased per frame toward the target;
  decays to centre when the pointer leaves the grid.
- **Mobile / touch:** the image drifts *vertically* with scroll
  position. No gyroscope, no permission prompt.
- **Per-tile depth factor:** each tile gets a small depth multiplier
  derived **deterministically** from its index (stable across
  renders), so the collage reads as varied depth and re-renders do
  not reshuffle which tile drifts most.
- **Magnitude:** a few pixels of overscan travel — felt, not seen.
  The overscan margin is sized to **always** exceed the maximum
  possible drift, so the frame edge is never exposed.
- Same wrapper and treatment apply to video tiles.

### Tile settle — intro split + scroll-driven, one-shot

- **Intro split.** The from-index scattered-entrance sequence in the
  intro module is narrowed to animate only **first-screen tiles** —
  measured against the current viewport at the moment of
  `mosaic:ready`. Below-fold tiles are left in their hidden
  pre-state (`opacity: 0; scale(1.04)`) and handed to the scroll
  observer. The "furthest tile" timing for the chrome reveal keys
  off the first-screen subset only, so the chrome reveals sooner on
  tall projects.
- **One `IntersectionObserver`** per Mosaic owns every below-fold
  tile. On the first crossing of a tile from **either edge**, it
  applies the same `scale(1.04) → scale(1)` + opacity reveal, then
  **`unobserve`s** the tile so it never re-animates. Reverse-scroll
  flicker is structurally impossible because the trigger fires once
  and is then gone.
- **Settle-before-centre.** A `rootMargin` nudge fires the settle
  slightly *before* the tile is comfortably in view, so the visitor
  is not watching it animate under their nose.
- **Easing reused.** The settle re-uses the intro's existing
  `cubic-bezier(0.23, 1, 0.32, 1)` ease and its `FADE_MS` / `ZOOM_MS`
  durations, so it reads as the same craft extended.
- **Direct load / reload.** No intro path runs. The observer drives
  every tile: on-screen tiles settle immediately on load, below-fold
  as reached. Both paths end in the same fully-settled DOM state.
- **From-index path.** Intro animates first-screen tiles; observer
  is wired up after the intro hands off and drives every below-fold
  tile from that point.

### Gate shear — momentum, sub-degree

- **Whole grid**, not per-tile (per-tile shear is busy and fights
  Frame drift; per-grid shear stays cinematic).
- **Sub-degree:** ~0.4° at a normal scroll, hard-clamped to a
  small upper bound (~1.2°) even on a violent flick.
- **Smoothed + clamped** scroll velocity — a hard touch-flick eases
  in instead of snapping; decays to 0° at rest within a few frames.
- Reverse scroll mirrors momentum naturally — correct, no special-
  casing.

### One shared rAF writer (the jank-safety contract)

A single `requestAnimationFrame` loop owns **all** transform writes
for all three layers. Per frame it:

- Reads input once: pointer target (desktop), `scrollY` (mobile +
  Gate shear), derived scroll velocity.
- Eases (lerps) the cursor-drift target and the shear target toward
  their goals.
- Writes each layer's transform to its node — drift to the `<img>` /
  `<video>`, settle to `.mosaic__settle` only when the observer fires
  (settle is not driven by the rAF loop frame-by-frame; it is a
  one-shot CSS transition), shear to `.mosaic__grid`.
- **Stops itself** when everything is at rest: pointer outside the
  grid *and* scroll velocity ≈ 0 *and* drift decayed to centre.
  Re-armed by the next `pointermove` over the grid or by the next
  `scroll` event.

No per-layer timers. No competing rAFs. No work while the page is
idle. This is the same discipline the v22 path earned and v23 lost.

### Reduced motion — all three layers off

Under `prefers-reduced-motion`:

- The `.mosaic__settle` wrapper exists but its pre-state and the
  observer's settle are no-ops; tiles render in their final state.
- Frame drift never starts (no event wiring, no overscan-driven
  translate writes).
- Gate shear never starts (no scroll-velocity listener writes,
  `.mosaic__grid` keeps `transform: none`).
- The from-index intro continues to no-op as today.

The page is byte-for-byte today's behaviour for these visitors.

### What stays untouched

- The **Void** (`index.html` and its WebGL field). Hard constraint.
- The Projects index. The Listing. The Admin.
- `mosaic.js`'s tile classification (`is-wide` / `is-tall` from
  natural aspect ratio).
- `mosaic.js`'s video-tile `IntersectionObserver` that plays/pauses
  videos by 25% visibility — a separate observer from the
  Tile settle one.
- The `mosaic:ready` handshake between `mosaic.js` and the intro.
- Film-only stack layout (`mosaic__grid--film`) — all three layers
  apply equally; nothing assumes the 3-column grid.

### Naming, glossary, and ADR

- `CONTEXT.md` already documents **the living Mosaic**, **Frame
  drift**, **Tile settle**, and **Gate shear** under
  *Behavioural vocabulary* (done inline with the plan).
- An ADR may be earned at build for the **intro split**
  (first-screen-only assembly + observer hand-off) — it is mildly
  surprising to a future reader and is a real trade-off. Offered,
  not yet written.

## Testing Decisions

A good test for the living Mosaic watches what happens on the page,
not what happens inside the script. Tests bound to "an observer is
registered for tile N" or "the rAF callback ran X times" would couple
to choices expected to be tuned during build. The existing PRDs on
this site (`the-reach.md`, `the-reach-clutch.md`,
`void-mobile-density-prd.md`) verify against externally observable
behaviour — what the canvas looks like, whether the page jerks,
whether the rAF loop is actually idle — never JS internals. The
living Mosaic follows the same convention.

Verification matrix, run as a manual checklist:

1. **Desktop, pointer over the grid:** photos drift inside their
   frames toward the cursor with ease, decay back to centre when
   the pointer leaves. **No seam** is ever visible between adjacent
   tiles at any cursor position — including the corners of the
   grid.
2. **Desktop, scroll down through a tall project:** each below-fold
   tile settles once on first crossing (the same scale-and-fade as
   the intro). **Scroll back up:** already-settled tiles stay
   solid; **no re-pop**. **Scroll down again:** still no re-pop.
3. **Desktop, fast scroll:** the grid shears sub-degree with scroll
   velocity, **returns flat** within a few frames at rest. The
   shear is felt, never a visible tilt.
4. **Touch, flick down then back up:** images drift vertically with
   scroll position; no re-settle, no flicker on the way back up,
   no slideshow effect; the iOS rubber-band overshoot does not
   re-trigger any tile.
5. **From-index navigation:** the radial first-screen assembly
   looks as it does today; **only first-screen tiles** participate
   in the radial; **below-fold tiles** settle as reached, not
   before; chrome reveals after the **furthest first-screen tile**
   has settled (and so reveals sooner on tall projects than it
   does today).
6. **Direct load / reload on a tall project:** no intro path; every
   on-screen tile is settled by the time the page is interactive;
   below-fold tiles settle as reached.
7. **Anchor jump / fast scroll-up bringing an unseen tile in from
   the bottom edge:** the tile still settles once — direction-
   agnostic.
8. **Pointer leaves the grid:** Frame drift decays to centre on
   every tile; the rAF loop subsequently sleeps.
9. **Idle (DevTools Performance):** with the pointer off the grid
   and scrolling stopped, no `requestAnimationFrame` callbacks are
   firing for the living Mosaic. Verifies the "sleeps when idle"
   contract.
10. **`prefers-reduced-motion`:** none of the three layers run; the
    page is identical to today; the from-index intro continues to
    no-op as today.
11. **Film-only project (`mosaic__grid--film`):** the single-column
    stack also drifts, settles, and shears — no layout assumption
    leaks.
12. **Video tile regression:** the existing 25%-visibility play/
    pause IntersectionObserver still drives video playback; videos
    drift and settle exactly like photo tiles; one-unmuted-at-a-time
    behaviour is unchanged.
13. **Void regression:** `index.html` and its WebGL field look and
    perform exactly as they do today on the same device. The
    living Mosaic has not paid for itself with Void budget.

Prior art: the verification checklists at the end of
[the-reach.md](the-reach.md), [the-reach-clutch.md](the-reach-clutch.md),
and [void-mobile-density-prd.md](../void-mobile-density-prd.md) — all
observable on the page or in DevTools, none coupled to JS internals.

## Out of Scope

- The **Void** (`index.html`) and any WebGL behaviour — untouched
  by hard constraint.
- Any sound; the site stays silent.
- Gyroscope / device-orientation parallax (rejected: a second
  sensor permission prompt for a portfolio).
- A loupe, lift-on-approach, or cursor-attention effect (considered
  in planning, cut to keep two reactive layers, not four).
- Sprockets, paper texture, page transitions, or any other literal
  film-prop skeuomorphism. The lift is reactive depth, not props.
- Per-tile shear (rejected as busy; would also fight Frame drift).
- The Projects index, the Listing, the Admin — this pass is
  Mosaic-only.
- A discoverability hint ("move your cursor over a photo") —
  discoverable through use, matching the rest of the site.
- Cutting the **intro split** ADR — offered, not yet written; that
  is a build-time decision.

## Further Notes

- The living Mosaic is load-bearing on the v22/v23 de-jank lesson
  stored in memory: a single rAF writer that **sleeps when nothing
  is moving**, transform/opacity only, no new filters or layout
  thrash. That discipline is the reason this pass is safe even
  though it adds three reactions instead of one.
- The umbrella term **the living Mosaic** is deliberate. The three
  layers are independently composable and removable; **Gate shear**
  is the first to drop if the page ever feels busy. Naming them
  separately makes that choice possible.
- The **intro split** is the one mildly surprising architectural
  shift this PRD introduces ("why does the from-index intro only
  animate the first screen?"). It earns a small ADR at build, by
  the same convention that earned ADR 0011 for the clutch's
  `calib.size` re-anchor.
- The PRD avoids file paths and line numbers; the plan file
  [plan-mosaic-alive.md](../../plan-mosaic-alive.md) carries the
  current seams (`mosaic.js`, the intro block in `script.js`, the
  `.mosaic__item` rule in `styles.css`) for the implementer to read
  at the moment of build.
