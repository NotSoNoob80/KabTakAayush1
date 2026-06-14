# PRD — About page renders at correct phone proportions on first paint

- Status: Draft
- Date: 2026-06-14
- Related: [docs/about-aspect-ratio-fix-plan.md](about-aspect-ratio-fix-plan.md),
  [docs/prd-about-phone-fit.md](prd-about-phone-fit.md),
  [ADR 0003](adr/0003-listing-keeps-scrub-on-phones.md),
  [CONTEXT.md](../CONTEXT.md)
- Tracker: no issue tracker is currently configured for this repo, so this PRD
  lives as a doc. If a tracker is wired up later, this file is the source to
  paste from; the expected starting state is `ready-for-agent`.

## Problem Statement

A visitor opening the About page on an Android phone (reported on a Nothing
Phone 2a, Chrome, CSS viewport ≈ 411×891) sees the **whole page** load
zoomed-out: the nav, the Listing card, and the footer all render at
tablet-proportions, as if the page were laid out for a much wider screen and
then shrunk to fit. The first scroll — typically down to the footer and back —
**snaps the layout to correct phone proportions**, and it stays correct after
that.

The visitor's first impression of the page is a broken, miniature version of
it. The fact that scrolling "fixes" the layout doesn't help: many visitors will
have already judged the page (or bounced) before that round-trip happens. This
is distinct from the copy-clipping bug fixed in v5 (see
[prd-about-phone-fit](prd-about-phone-fit.md)) — that work shipped and is not
the cause here; this is a separate first-paint zoom bug rooted in horizontal
overflow.

## Solution

Make the About page incapable of overflowing the phone viewport horizontally,
even for the first frame, so Android Chrome has no reason to invoke its
"shrink-to-fit" widening of the layout viewport. The page then renders at true
phone proportions on first paint, and the existing scroll-pinned scrub,
footer wordmark, and outro behave exactly as they do today.

Three CSS-only containment moves, applied to `styles.css` (and, if the hunt
finds extra offenders, small markup adjustments to `about.html`):

- **Contain overflow at the `body` level** with `overflow-x: clip` + a
  `max-width: 100%` floor, backing up the existing `html { overflow-x: hidden }`
  so the layout viewport can't widen to contain overflowing children.
- **Stop the footer wordmark from poking past the viewport.** Its negative
  horizontal margins (`-48px` desktop, `-24px` phone) create the edge-to-edge
  bleed; cap it with `max-width: 100vw` and/or give `.footer` a clipped
  overflow context so the bleed is contained, not exported.
- **Guard the `.listing__stage` base width** with `max-width: 100vw` so the
  desktop base value `min(135vmin, 2000px)` cannot feed the first-paint
  overflow loop on phones before the `@media (max-width: 980px)` rules apply.

`listing.js` is **not** modified — consistent with
[ADR 0003](adr/0003-listing-keeps-scrub-on-phones.md). The card tilt's swing
past `100vw` is already clipped by `.listing__viewport { overflow: hidden }`
and is not a page-level overflow source.

Target widths (the matrix the plan is built around): **320, 360, 411, 430 px.**
The binding case is **411 px (Nothing 2a — the reported device).**

## User Stories

1. As a visitor on a Nothing Phone 2a (411 px wide), I want the About page to
   render at correct phone proportions on the very first frame, so that I
   don't see a zoomed-out tablet-looking flash before scrolling.
2. As a visitor on a Nothing Phone 2a, I want the page to look the same before
   and after I scroll, so that I don't have to "wiggle" the page to make it
   usable.
3. As a visitor on a small Android (320 px wide), I want the page to render
   at correct phone proportions on first paint, so that the page isn't
   shrunk-to-fit on the narrowest devices.
4. As a visitor on a common older Android (360 px wide), I want the same first-
   paint correctness.
5. As a visitor on a large phone (430 px wide), I want the same first-paint
   correctness.
6. As a visitor on any phone, I want **no horizontal scroll** anywhere on the
   About page, so that the page feels native to my device.
7. As a visitor on any phone, I want the footer wordmark to still read
   **edge-to-edge** as a dense signature, so that the visual intent is
   preserved — the bleed is contained, not removed.
8. As a visitor on any phone, I want the Listing scrub, SOLD stamp, debris
   animation, and outro to behave exactly as they do today, so that nothing
   about the page's identity changes.
9. As a visitor on any phone, I want the v5 phone-fit improvements (trimmed
   copy, `dvh` viewport, breakpoint order) to stay in place, so that the
   previously-fixed copy-clipping bug doesn't return.
10. As a visitor on desktop (≥641 px wide), I want the page to look exactly as
    it does today — this change is mobile-correctness only.
11. As a visitor with `prefers-reduced-motion`, I want the existing static
    stacked fallback to be untouched.
12. As the site author, I want the fix to be **CSS-only** wherever possible,
    so that the motion code (`listing.js`) — which is presumed innocent and
    governed by ADR 0003 — remains untouched.
13. As the site author, I want a documented diagnostic step (the DevTools
    overflow-hunt query) recorded in the plan, so that I can re-run it any
    time a future change risks reintroducing horizontal overflow.
14. As the site author, I want the verification to assert
    `documentElement.scrollWidth === clientWidth` and an **empty** overflow
    list at every target width, so that "no shrink-to-fit trigger remains" is
    objectively checkable, not a vibe.
15. As the site author, I want the fix to not depend on reproducing the URL-bar
    timing race — DevTools emulation can't surface it reliably — so that the
    acceptance test is an overflow-elimination check, not a timing check.
16. As the site author, I want the footer wordmark's bleed values (`-24px` /
    `-48px`) only tightened **if** parent-clipping isn't enough, so that the
    visual intent is preserved by default.

## Implementation Decisions

- **Scope is CSS / markup only.** `styles.css` is the primary surface; small
  markup adjustments to `about.html` are allowed if the overflow hunt finds an
  element whose bleed can't be contained from CSS alone. `listing.js` is **not**
  modified.
- **Three containment changes, in this order:**
  - **A. `body` overflow clip.** `body { overflow-x: clip; max-width: 100%; }`
    on top of the existing `html { overflow-x: hidden; }`. `clip` is preferred
    over `hidden` because it creates no scroll container; `hidden` remains as
    the legacy fallback on `html`.
  - **B. Footer wordmark containment.** `.footer__wordmark { max-width: 100vw; }`
    and either ensure `.footer`'s horizontal padding ≥ the wordmark's negative
    margin or give `.footer { overflow-x: clip }` so the bleed is contained,
    not exported. The negative margins themselves (`-24px` phone, `-48px`
    desktop) are **not** tightened unless parent-clipping turns out to be
    insufficient — preserving the edge-to-edge visual intent comes first.
  - **C. Listing stage width guard.** `.listing__stage { max-width: 100vw; }`
    as a belt over the existing `min(135vmin, 2000px)` base value. Harmless on
    desktop (the stage is already ≤ viewport there), removes the un-reined
    base value from the first-paint overflow loop on phones.
- **Diagnostic step is part of the implementation, not separate.** Before
  applying A–C, the implementer runs the overflow-hunt query at each target
  width (320, 360, 411, 430) and records every element whose
  `getBoundingClientRect()` exceeds the document width. Each offender is
  addressed. The same query is re-run after every change until the list is
  empty at all four widths.
- **`listing.js` is not modified.** Consistent with
  [ADR 0003](adr/0003-listing-keeps-scrub-on-phones.md). The card tilt's
  overflow is already clipped by `.listing__viewport { overflow: hidden }`,
  so it is not a page-level overflow source. The `rotScale` damp at
  `@media (max-width: 980px)` continues to apply.
- **v5 work is preserved.** The reordered phone breakpoints (640 → 430 → 360),
  trimmed copy, and `dvh` viewport unit from
  [prd-about-phone-fit](prd-about-phone-fit.md) stay exactly as shipped. This
  PRD builds on top of them, it does not revisit them.
- **No new ADR.** This is a bug fix (remove unintended horizontal overflow),
  not a hard-to-reverse architectural trade-off with genuine alternatives.
- **No `CONTEXT.md` change.** The glossary is for site vocabulary; a browser
  shrink-to-fit bug name is not site vocabulary.
- **Escalation path if needed.** If A–C clear every target width in DevTools
  emulation but the Nothing 2a still flashes zoomed-out on-device, the next
  pass uses `chrome://inspect` remote debugging to catch a *dynamic* overflow
  that only exists during the URL-bar transition. That escalation is **out of
  scope** for this PRD's emulation-only pass.

## Testing Decisions

This is a static HTML/CSS/JS site with no test runner — there is no unit-test
seam to wedge into. The only meaningful seam for a first-paint layout bug is
**the rendered page at each target viewport size, in Chrome DevTools device
emulation**. A good test asserts what the visitor sees on first paint, not
what selectors are present in the file.

- **Verification seam: a real browser at the target widths.** Chrome DevTools
  device emulation (or the dev preview at the same widths) is the seam.
  Reproduce the *before* state first (confirm the overflow-hunt query returns
  offenders and the page renders zoomed-out), then apply A–C, then verify.
- **Targets (the matrix the plan is built around):**
  - 320 px — narrowest small Android — worst case for wordmark / stage overflow
  - 360 px — common older Android
  - **411 px — Nothing Phone 2a — the reported device**
  - 430 px — largest phone (Pro Max / Plus class)
- **Per-width checks:**
  - Overflow-hunt query returns **zero** elements past the viewport edge.
  - `documentElement.scrollWidth === clientWidth` — no horizontal scroll.
  - Page renders at correct phone proportions **on first paint** — no
    zoomed-out / tablet flash before any scroll.
  - After scrolling down to the footer and back, layout is unchanged (the
    first paint already matched the post-scroll state).
  - Footer wordmark still reads edge-to-edge; no letters lost beyond the band.
  - Listing scrub, SOLD stamp, debris crossfade, and outro behave as before.
- **Robustness checks:**
  - With `prefers-reduced-motion` enabled on a phone, the existing stacked
    static layout still renders (untouched by this change).
  - At desktop widths (≥641 px), the page is visually unchanged.
- **First-paint check is the real acceptance test.** If emulation can't
  surface the URL-bar timing race, an empty overflow list at every width is
  the proxy: with nothing exceeding `100vw`, Chrome has no reason to invoke
  shrink-to-fit.
- **Prior art:** the rest of the site already validates responsive layouts the
  same way. [prd-about-phone-fit](prd-about-phone-fit.md) tuned the v5 phone
  fit by rendering at a width matrix; this PRD continues that pattern at a
  width matrix tuned to the **shrink-to-fit** failure mode (320 / 360 / 411 /
  430), not the content-fit one (320 / 360 / 375 / 390 / 393 / 430). A test
  framework is **not** introduced as part of this PRD.

## Out of Scope

- Desktop / tablet (≥641 px) layout, copy, and the card-tilt crop — unchanged.
- `listing.js` — **not modified**. Per ADR 0003, the card-tilt overflow is
  already clipped by `.listing__viewport`; the page-level zoom is a CSS
  overflow problem.
- The v5 phone-fit work (`dvh`, breakpoint order, trimmed copy) — unchanged;
  this PRD builds on top of it.
- The `prefers-reduced-motion` stacked fallback — unchanged.
- Other pages on the site (`projects.html`, `project.html`, `index.html`) —
  not part of this PRD. If they exhibit the same shrink-to-fit symptom,
  that's a separate hunt.
- **On-device remote debugging.** No on-device `chrome://inspect` pass is
  performed here; this PRD is DevTools-emulation only. If A–C ship and the
  Nothing 2a still flashes, a follow-up PRD covers the on-device escalation.
- Introducing a test framework or CI — not done here.

## Further Notes

- **The fix targets the cause, not the symptom.** The symptom is "scroll
  corrects it"; the cause is horizontal overflow during the first paint that
  triggers Android Chrome's shrink-to-fit, widening the CSS layout viewport.
  Removing every element past `100vw` eliminates the trigger, which is more
  robust than trying to influence Chrome's URL-bar timing.
- **`overflow-x: clip` is preferred over `hidden` on `body`.** `clip` does not
  create a scroll container, avoids the extra paint pass, and on Android
  reliably prevents the layout viewport from widening to contain children —
  which `overflow-x: hidden` on `html` alone does not.
- **The footer wordmark is the prime suspect, but not the only suspect.** The
  diagnostic step in the plan is mandatory — the hunt may turn up secondary
  offenders (e.g. `.listing__outro-stamp`, any element with a negative
  horizontal margin or un-clamped `vw` width on `about.html`). Each offender
  is fixed in the same containment style, not by removing the bleed.
- No issue tracker is configured for this repo. If one is added later, this
  PRD is the source to paste from; a `ready-for-agent` triage label is the
  expected starting state.
