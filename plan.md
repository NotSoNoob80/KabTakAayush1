# Plan — Performance & touch-correctness polish (Emil Kowalski design pass)

## Goal

A targeted polish pass on the site's motion/rendering layer, found by reviewing
the design through Emil Kowalski's design-engineering principles. The site
already follows most of them well (it defines Emil's exact strong easing curves,
uses `:active { scale(0.97) }` on buttons, gates most hovers behind
`@media (hover: hover)`, and has thorough `prefers-reduced-motion` coverage), so
this is a **polish pass, not a rescue**.

Scope was deliberately narrowed to **performance + correctness only** — changes
that are low-risk, have no intended desktop visual change, and fix things that
are objectively wrong rather than matters of taste. Motion-feel trims (duration
tuning, easing coherence) and the scroll-jacking UX review were considered and
**left out of scope** for this pass.

## Findings considered but NOT actioned (honesty record)

- **`filter: blur(6px)` on `[data-reveal]` reveals** — looked expensive, but
  `data-reveal` appears only 22 times across all pages (3–6 elements per page),
  never a mass simultaneous blur. **Verified acceptable, no action.**
- **`will-change` on `.landing__track` / `.landing__frame`** — these animate
  every frame while the reel scrolls, and the per-frame layer is a *documented*
  fix (the code comments say it stops grayscale-filter re-rasterization shimmer).
  Removing it blind would risk that regression. **Left alone by design.**
- **Long entrance durations** (`.landing__title` 900ms, reveals 700ms) and
  **mixed durations within one `.btn` hover** — real but subjective; out of the
  perf+correctness scope chosen for this plan.
- **Landing scroll-jacking** (`wheel` captured with `preventDefault`) — a UX
  judgment call, not a defect. Out of scope.

## Decisions (locked via grill)

1. **Scope = performance + correctness only.** No intended change to desktop
   visuals or motion feel.
2. **`will-change` cleanup = footer wordmark chars only.** Remove the permanent
   `will-change: transform` from `.footer__wordmark .char` and apply it only
   while the letter is hovered. The reel's `track`/`frame` layers are **not**
   touched (they animate continuously and their layer is documented as an
   anti-jitter fix).
3. **Touch-hover hygiene = gate the three ungated `:hover` rules** so they can't
   latch after a tap on touch devices.
4. **No `CONTEXT.md` change, no ADR.** These are implementation/perf details,
   not glossary terms, and the changes are easily reversible CSS — neither doc
   surface is earned.

## Current state

- `.footer__wordmark .char` carries `will-change: transform` permanently —
  ~11 compositor layers sitting idle until a hover that may never come.
  [styles.css:2013](styles.css)
- Three `:hover` rules are **not** gated behind `@media (hover: hover) and
  (pointer: fine)`, so on touch they latch until the next tap elsewhere:
  - `.nav__mark:hover { opacity: 0.7 }` [styles.css:140](styles.css)
  - `.landing__frame:hover img { transform: scale(1.05) }` [styles.css:495](styles.css)
  - `.footer__col a:hover::after { transform: scaleX(1) }` [styles.css:1924](styles.css)
- For contrast, the cards, mosaic tiles, index rows, and the footer wordmark's
  own per-letter hover are **already** correctly gated — these three were simply
  missed.

## Implementation

### 1. Footer wordmark — `will-change` only while hovered (`styles.css`)

In the base `.footer__wordmark .char` rule, **remove** the standing
`will-change: transform;`. Add it to the hover state instead so the layer is
promoted only for the brief moment the letter actually transforms:

```css
.footer__wordmark .char {
  /* …existing… */
  /* will-change: transform;  ← remove this line */
}

.footer__wordmark .char:hover {
  /* …existing color + transform… */
  will-change: transform;
}
```

- Leave the `--flicker` and `--piano` variants' hover rules as they are; the
  base `:hover` promotion above covers them since they share the `.char` box.
- Do **not** add `will-change` to the touch `.is-press` / Glissando classes — a
  press is a one-shot animation; promotion mid-keyframe isn't worth the churn.

### 2. Gate the three ungated hovers (`styles.css`)

Wrap each in `@media (hover: hover) and (pointer: fine) { … }`, matching the
pattern the cards/mosaic already use. Desktop behaviour is byte-for-byte
unchanged; touch simply stops latching the state.

- `.nav__mark:hover { opacity: 0.7 }`
- `.landing__frame:hover img { transform: scale(1.05) }`
- `.footer__col a:hover::after { transform: scaleX(1) }`

Keep the `transition` declarations on the base elements (they're harmless and
also serve focus states); only the `:hover` *result* needs gating.

## Scenarios / edge cases to honour

- **Tap a reel frame on a phone** — the image must not stay scaled at 1.05 after
  the finger lifts (today it can, since `.landing__frame:hover img` is ungated).
- **Tap a footer column link on a phone** — its gold underline must not stay
  drawn after the tap.
- **Hybrid devices (touch laptop / Surface)** — `@media (hover: hover) and
  (pointer: fine)` keys off the *primary* pointer, consistent with the rest of
  the file; no special-casing needed.
- **Reduced motion** — unchanged. The footer `will-change` move is a paint-hint
  only (no new motion), and the reduced-motion block already neutralizes these
  hovers' transforms.
- **Keyboard focus** — `.footer__col a` reveals its underline via `:hover` only
  today; gating `:hover` does not remove any focus affordance that exists now.
  (If a future pass wants focus parity, that's a separate change.)

## Out of scope

- The reel `track`/`frame` `will-change` layers (documented anti-jitter).
- Any duration/easing-coherence tuning or the `scroll-cue` infinite-loop curve.
- The landing scroll-jacking review.
- `.card__media img` `filter: brightness` hover (paint-path) — noted, deferred.
- No markup changes, no JS changes, no `CONTEXT.md`/ADR changes.

## Verification

- **Desktop (pointer device):** footer per-letter hover, nav mark dim, reel
  frame zoom, and footer-link underline all behave **exactly** as before. No
  visual diff.
- **DevTools › Rendering › Layer borders:** confirm the footer wordmark no
  longer shows a standing compositor layer per letter at rest; the layer appears
  only on hover.
- **Touch (phone / DevTools device emulation):** tap a reel frame, a nav mark,
  and a footer link — none of the three hover states stays stuck after the tap.
- **Reduced motion:** no regression; hovers stay neutralized as today.
