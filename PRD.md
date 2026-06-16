# PRD — Performance & touch-correctness polish (Emil Kowalski design pass)

## Problem Statement

On touch devices, three `:hover`-driven visual states on the site latch on
after a tap and stay stuck until the user taps somewhere else: the nav mark
dims, a reel frame's image stays scaled up by 5%, and a footer column link's
gold underline stays drawn. From the visitor's perspective the page "remembers"
that they touched something and won't let go — it looks broken, even though
desktop behavior is fine.

Separately, on every page the footer wordmark sits with eleven idle compositor
layers (`will-change: transform` on each `.char`), pre-promoted for a hover
that may never happen. The user can't see this directly, but it's wasted GPU
memory and paint work on a page they may only scroll past.

## Solution

A small, low-risk CSS-only polish pass that:

1. Stops the three ungated `:hover` rules from firing on touch devices by
   wrapping each result in `@media (hover: hover) and (pointer: fine)`, the
   same gate the rest of the file already uses for cards, mosaic tiles, and
   the wordmark's per-letter hover.
2. Removes the standing `will-change: transform` from the base
   `.footer__wordmark .char` rule and applies it only while a letter is
   actually hovered, so the compositor layer is promoted just for the brief
   moment it transforms.

No markup changes, no JS changes, no intended desktop visual change, no
documentation surface added.

## User Stories

1. As a phone visitor tapping a reel frame on the landing page, I want the
   image to return to its normal size when I lift my finger, so that the page
   doesn't look stuck on whatever I last touched.
2. As a phone visitor tapping a footer column link, I want the gold underline
   to not stay drawn after the tap, so that the link doesn't appear permanently
   "selected".
3. As a phone visitor tapping the nav mark, I want it to not stay dimmed at
   70% opacity after the tap, so that the header element doesn't look broken
   for the rest of my session.
4. As a phone visitor, I want my next tap elsewhere on the page to not be
   "consumed" just to clear a stuck hover state from the previous tap, so that
   navigation feels responsive instead of two-step.
5. As a desktop visitor with a mouse, I want the nav mark, reel frame zoom,
   and footer-link underline hovers to behave exactly as they do today, so
   that this fix introduces no regression to the experience I'm used to.
6. As a desktop visitor using keyboard navigation, I want focus affordances on
   footer column links to be no worse than they are today, so that this change
   is neutral for keyboard users.
7. As a Surface or touch-laptop user (hybrid device), I want the site to use
   my primary pointer to decide whether hovers apply, consistent with the rest
   of the page, so that behavior is predictable across the device.
8. As a visitor with `prefers-reduced-motion` enabled, I want the existing
   reduced-motion neutralization of hovers to continue working unchanged, so
   that my accessibility preference is still honored.
9. As a visitor on any device, I want the footer wordmark's per-letter hover
   animation to feel identical to today when I do hover a letter, so that the
   `will-change` move is invisible to me.
10. As a visitor scrolling past the footer without interacting with it, I want
    the browser not to maintain compositor layers for letters I never touched,
    so that scroll and paint stay cheap even on lower-end devices.
11. As a developer reviewing the diff, I want the change to be entirely within
    `styles.css` with no JS or HTML edits, so that the blast radius is obvious
    and the change is easily revertable.
12. As a developer running DevTools' "Layer borders" overlay, I want to see no
    standing compositor layer per footer wordmark letter at rest, and a layer
    appearing only on hover, so that I can verify the `will-change` cleanup
    landed correctly.
13. As a developer reading the documented anti-jitter `will-change` on
    `.landing__track` / `.landing__frame`, I want those layers left untouched,
    so that the grayscale-filter re-rasterization shimmer fix the comments
    describe is preserved.
14. As a developer reading the touch `.is-press` / Glissando classes on
    footer letters, I want them left alone (no added `will-change`), so that
    the one-shot press animation isn't churned by mid-keyframe layer promotion.

## Implementation Decisions

- **Module touched:** `styles.css` only. No edits to `gallery.js`, any HTML
  file, or any asset.
- **Scope discipline:** performance + correctness only. No duration tuning, no
  easing-coherence pass, no scroll-jacking review. Those were considered and
  intentionally deferred (see Out of Scope).
- **Touch-hover gating pattern:** reuse the existing
  `@media (hover: hover) and (pointer: fine) { … }` pattern already applied to
  cards, mosaic tiles, index rows, and the footer wordmark's per-letter hover.
  Apply it to exactly three rules that were missed:
  - `.nav__mark:hover { opacity: 0.7 }`
  - `.landing__frame:hover img { transform: scale(1.05) }`
  - `.footer__col a:hover::after { transform: scaleX(1) }`
  Only the `:hover` *result* is gated. The base `transition` declarations stay
  put — they're harmless and also serve focus states.
- **`will-change` cleanup, narrow form:** remove the standing
  `will-change: transform` from `.footer__wordmark .char` and add it inside
  the `:hover` selector instead. The `--flicker` and `--piano` variant hovers
  inherit the promotion through the shared `.char` box and do not need their
  own `will-change`.
- **Explicitly NOT touched:**
  - `.landing__track` and `.landing__frame` `will-change` — they animate every
    frame while the reel scrolls and the layer is a documented anti-jitter fix.
  - Footer letter touch `.is-press` / Glissando classes — press is a one-shot
    animation; promoting mid-keyframe isn't worth it.
  - `[data-reveal]` `filter: blur(6px)` — verified acceptable (only ~22 uses
    site-wide, 3–6 per page, never a mass simultaneous blur).
  - `.card__media img` `filter: brightness` hover — noted as a paint-path
    concern but deferred from this pass.
- **No CONTEXT.md change, no ADR.** These are implementation/perf details, not
  glossary terms or architectural decisions; the changes are easily reversible
  CSS and neither doc surface is earned.

## Testing Decisions

This is a CSS-only polish pass on a static site with no existing automated
test suite. "Tests" here means a manual verification checklist that exercises
external behavior — what a visitor sees and feels — not the internals of the
CSS cascade.

A good test in this scope:
- Drives real browser behavior on representative devices (a desktop pointer
  device, a touch device or DevTools touch emulation, and at least one hybrid
  device check via emulation).
- Asserts on observable visitor outcomes: "the image returns to its base
  scale", "the underline disappears", "the nav mark is no longer dimmed",
  rather than on the presence or absence of specific CSS properties.
- Includes a paint-layer assertion using DevTools' Rendering › Layer borders
  overlay, since the `will-change` change has no visual effect but is
  specifically about layer promotion timing.
- Includes a reduced-motion check, since the reduced-motion block already
  neutralizes the affected hovers and must continue to do so.

Verification checklist (what to run before calling this done):

1. **Desktop, pointer device** — hover the nav mark, hover a reel frame,
   hover a footer column link, hover a footer wordmark letter. Each behaves
   exactly as it did before the change. No visual diff.
2. **DevTools › Rendering › Layer borders, footer in view, no interaction** —
   confirm there is no standing compositor layer per `.footer__wordmark .char`.
3. **DevTools › Rendering › Layer borders, hovering one wordmark letter** —
   confirm a compositor layer appears for that letter while hovered, and goes
   away on un-hover.
4. **Phone or DevTools touch emulation** — tap a reel frame, tap the nav
   mark, tap a footer column link. None of the three hover states remains
   stuck after the tap.
5. **Hybrid device (touch laptop / Surface)** via emulation — primary pointer
   correctly governs hover behavior; no special-casing required.
6. **`prefers-reduced-motion: reduce`** — hovers stay neutralized, identical
   to current behavior.
7. **Keyboard focus on footer column links** — no regression vs. today (today
   the underline is reveal-on-hover only; this change does not remove a focus
   affordance that exists now).

Prior art for "tests" on this codebase: the existing pattern of gated hovers
on cards, mosaic tiles, index rows, and the footer wordmark's per-letter
hover is the visual reference. The fix should make the three ungated rules
indistinguishable in behavior from that prior art on every device class.

## Out of Scope

- The reel `track` / `frame` `will-change` layers (documented anti-jitter fix
  — touching them risks regressing the grayscale-filter re-rasterization
  shimmer the code comments describe).
- Any duration or easing-coherence tuning, including the long entrance
  durations (`.landing__title` 900ms, reveals 700ms) and the mixed durations
  within one `.btn` hover. Real but subjective; outside the perf+correctness
  scope of this pass.
- The `scroll-cue` infinite-loop curve.
- The landing scroll-jacking UX review (`wheel` captured with `preventDefault`
  is a UX judgment call, not a defect).
- `.card__media img` `filter: brightness` hover paint-path concern — noted,
  deferred.
- No markup changes, no JS changes, no `CONTEXT.md` change, no ADR.
- Adding focus-state parity to `.footer__col a` underline reveal. If a future
  pass wants keyboard parity with hover, that is a separate change.

## Further Notes

- **Honesty record from the plan**, kept for context on why several findings
  were considered but not actioned:
  - `filter: blur(6px)` on `[data-reveal]` looked expensive but is used only
    ~22 times across all pages (3–6 per page), never a mass simultaneous blur.
    Verified acceptable.
  - `will-change` on `.landing__track` / `.landing__frame` is a *documented*
    per-frame anti-jitter layer; removing it blind would risk regression.
  - Long entrance durations and mixed `.btn` hover durations are matters of
    taste and outside the chosen scope.
  - Landing scroll-jacking is a UX judgment call, not a defect.
- Why this is framed as a polish pass rather than a rescue: the site already
  defines Emil Kowalski's exact strong easing curves, uses `:active scale(0.97)`
  on buttons, gates most hovers behind `@media (hover: hover)`, and has
  thorough `prefers-reduced-motion` coverage. The three ungated hovers and the
  standing footer wordmark `will-change` are simply oversights against the
  existing patterns, not a new direction.
- The exact line references at the time the plan was written (subject to
  drift): `styles.css:140` (nav mark), `styles.css:495` (landing frame),
  `styles.css:1924` (footer col link), `styles.css:2013` (footer wordmark
  char). Grep for the selector names rather than trusting the line numbers
  when implementing.
