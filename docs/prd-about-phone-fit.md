# PRD — About (Listing) page fits common phone sizes

- Status: Draft
- Date: 2026-06-14
- Related: [docs/about-phone-fit-plan.md](about-phone-fit-plan.md),
  [ADR 0003](adr/0003-listing-keeps-scrub-on-phones.md),
  [CONTEXT.md](../CONTEXT.md)
- Tracker: no issue tracker is currently configured for this repo, so this PRD
  lives as a doc. If a tracker is wired up later, this file is the source to
  paste from.

## Problem Statement

A visitor opening the About page on a phone sees a Listing page that was built
for a desktop screen. The cards in the scroll-pinned sequence (Roti, Kapda,
Makaan, Art) display in a frame too tall and too narrow for the content inside
them: the body **status** copy spills past the card's bottom edge and gets
clipped by the card's `overflow: hidden`. The Makaan card is the worst — its
long paragraph is cut off well before the punchline lands. The centred card can
also tuck under the fixed top nav on the shortest phones, and the layout
visibly shifts when the mobile browser's address bar appears or disappears.

The visitor scrolls through the joke but only reads half of it.

## Solution

On phones, the Listing **keeps** its signature scroll-pinned scrub — it does
*not* fall back to the static stacked layout that `prefers-reduced-motion`
already provides (see [ADR 0003](adr/0003-listing-keeps-scrub-on-phones.md)).
The fit is achieved instead by:

- showing a **trimmed status** — a short one-line variant of each card's copy
  — in place of the desktop paragraph, so all four cards fit a phone-height
  frame at a readable size;
- shrinking the stage to the visible viewport with the corner illustration and
  the centred title/price both fully on screen;
- using the dynamic viewport unit (`dvh`) so the centred card doesn't shift
  when the address bar shows or hides;
- guarding the top of the centred card against the fixed nav on short phones.

Target devices: **320–430px wide, ≥667px tall.** The binding case is iPhone SE
(375×667) — the shortest viewport has the least room for card content.

## User Stories

1. As a visitor on an iPhone SE (375×667), I want every card's title, price,
   status line, and corner illustration to be fully visible inside the card,
   so that I can read the joke without losing the bottom of it.
2. As a visitor on an iPhone 12–15 (390×844), I want the same — at the most
   common modern iPhone size.
3. As a visitor on a Google Pixel (393×852), I want the same on Android.
4. As a visitor on a Pro Max / Plus iPhone (430×932), I want the cards to use
   the extra width gracefully without looking lost in space.
5. As a visitor on a small Android (320–360 wide), I want titles like "Makaan"
   to not overflow the card horizontally.
6. As a visitor on any phone, I want the cards to stay centred in the viewport
   while I scroll the scrub.
7. As a visitor on any phone, I want the page to keep its scroll-pinned
   classifieds animation — that's what the page *is* — rather than collapsing
   into a plain stacked list.
8. As a visitor on any phone, I want the centred card to not sit under the
   floating top navigation bar.
9. As a visitor on any phone, I want the layout to stay still when my browser's
   address bar collapses or expands as I scroll, so the page doesn't feel
   janky.
10. As a visitor on any phone, I want the SOLD stamp to land on the Makaan card
    on screen, not off it — the joke depends on seeing the stamp connect.
11. As a visitor on any phone, I want the house illustration to crumble inside
    the visible card, in step with the stamp, so the visual gag survives.
12. As a visitor on any phone, I want the mandala under Art to read clearly as
    a centrepiece behind the copy, not obscure the title.
13. As a visitor on any phone, I want no horizontal scroll on the page.
14. As a visitor on any phone, I want each card's trimmed status to be a
    coherent one-line punchline, not a truncated half-sentence.
15. As a visitor on any phone, I want the snap-to-beat behaviour to still
    settle me on the card the page wants me to read.
16. As a visitor with `prefers-reduced-motion`, I want the existing static
    stacked layout — phone or otherwise — unchanged.
17. As a visitor on a desktop (≥641px), I want the existing layout, copy, and
    animation exactly as they are today — this change is phone-only.
18. As a visitor on a wide touchscreen (e.g. a tablet in landscape ≥769px), I
    want the desktop layout (consistent with [ADR 0001](adr/0001-responsive-switches-on-width-not-pointer.md)).
19. As the site author editing copy later, I want to know that two copies of
    each card's status exist (full + trimmed) and that I'm expected to update
    both.

## Implementation Decisions

- **Scope is phone-only.** Desktop (≥641px) layout, copy, and animation are not
  touched. The static stacked fallback for `prefers-reduced-motion` is also not
  touched.
- **Two seams of work: `about.html` markup + `styles.css` rules.** `listing.js`
  is not modified. The trimmed-status swap is a CSS-only toggle on two `<span>`
  siblings inside the existing single `.listing__status` element, so the
  motion code's selector (`c.querySelector('.listing__status')`) continues to
  match the same one element it does today. Parallax keeps working untouched.
- **Trimmed status copy** (one line per card, replacing the lorem paragraph on
  phones):
  - Roti — "In stock, no waitlist — the easy one."
  - Kapda — "Sale rack, but it still counts."
  - Makaan — "EMI: 847 years, give or take a generation."
  - Art — "Priceless — ask anyone who isn't buying."
- **Breakpoint reorder.** Phone media-query blocks for the Listing are placed
  in **narrowest-last** source order (640px, then 430px, then optionally 360px)
  so the most specific breakpoint wins on the cascade. The existing
  `@media (max-width: 430px)` block today is dead code because a later
  `@media (max-width: 640px)` block overrides it — fixing this is part of the
  work, not a separate task.
- **Stage sizing on phones.** `.listing__stage` width derived from viewport
  width with a ceiling (e.g. `min(92vw, 520px)`); height derived from `dvh`
  with a ceiling (e.g. `min(70dvh, 700px)`). Card padding reduced to give the
  trimmed copy room to breathe without clipping.
- **Title floor.** Title `font-size` floor lowered enough that "Makaan" cannot
  exceed the card width at 320px.
- **Viewport unit fix.** `.listing__viewport` height becomes `100dvh` with a
  `100vh` fallback declared first, so legacy browsers still get a working
  value. `.listing__pin` (the scroll runway, `460vh`) stays in `vh` — it sets
  the page's *scroll length*, not its visible height, and `dvh` there would
  resize the runway mid-scroll.
- **Nav-overlap guard.** On phones, `.listing__viewport` adds `padding-top:
  var(--nav-h)`. Because the viewport is a centring flex column, the padding
  shrinks the centring box and reliably pushes the card below the fixed nav.
- **Illustration sizing.** Generic corner art keeps its existing %-based widths
  (the parent card now defines the small phone box). The mandala's overhang
  values stay relative to the card. If verification shows the mandala or house
  crowding the title on the smallest sizes, their widths are nudged down within
  the phone breakpoint only; opacity is unchanged.
- **No JS change to `rotScale`.** The `@media (max-width: 980px)` rotation damp
  in `listing.js` already keeps tilted corners on screen and applies on every
  phone size in scope.
- **CSS-JS coupling note.** [ADR 0001](adr/0001-responsive-switches-on-width-not-pointer.md)
  requires CSS and JS to stay in sync where they share a media query. The copy
  trim does **not** introduce a new shared media query (CSS-only), so that
  coupling is not extended.

## Testing Decisions

This is a static HTML/CSS/JS site with no test runner — there is no unit-test
seam to wedge into. The only meaningful seam for a responsive layout change is
the **rendered page at each target viewport size**. A good test here is one
that asserts what a visitor would see, not what selectors are present in the
file.

- **Verification seam: a real browser at the target sizes.** The dev preview
  (Claude Preview / a local static server such as the repo's existing
  `.claude/static-server.ps1`) is opened at each viewport in the matrix and the
  full scroll-scrub is exercised on each.
- **Targets (the matrix the plan and ADR are built around):**
  - 320×640 — narrowest small Android — title overflow check
  - 360×640 — common older Android
  - **375×667 — iPhone SE — binding case for content fit**
  - 390×844 — most common iPhone (12–15)
  - 393×852 — common Pixel
  - 430×932 — largest phone (Pro Max / Plus)
- **Per-card checks, on every size:** title visible, price visible, trimmed
  status visible (no clipping at the bottom of the card), corner illustration
  visible and not covering the title, card centred horizontally and vertically
  in the available frame, no horizontal page scroll.
- **Sequence checks:**
  - The SOLD stamp lands on the Makaan card, on screen, while the card is in
    its hold beat.
  - The intact house and crumbled house crossfade visibly within the card.
  - Snap-to-beat still settles after a stalled scroll.
  - The outro wordmark slams in and reads on every target size.
- **Robustness checks:**
  - With the mobile browser's address bar collapsing/expanding, the centred
    card does not visibly jump.
  - With `prefers-reduced-motion` enabled on a phone, the existing stacked
    static layout still renders (untouched by this change).
- **Prior art:** the rest of the site already validates responsive layouts the
  same way — there is no test suite anywhere in the repo, and existing
  responsive rules (Projects index, Mosaic, footer wordmark) were tuned by
  rendering at the breakpoints. This PRD continues that pattern; a test
  framework is not being introduced as part of it.

## Out of Scope

- Desktop / tablet layout (≥641px): unchanged.
- `prefers-reduced-motion` stacked fallback: unchanged.
- The scrub timeline values, the snap-to-beat algorithm, the price odometer,
  the debris physics, and the `rotScale` damp inside `listing.js`: unchanged.
- Editorial rewrite of the full desktop status paragraphs: not done here. The
  full copy stays as it is; only a short variant is added for phones.
- Introducing a test framework or CI: not done here.
- Wide-touchscreen behaviour (≥769px with `pointer: coarse`): unchanged,
  per [ADR 0001](adr/0001-responsive-switches-on-width-not-pointer.md).
- Other pages on the site: the index (`projects.html`), Mosaic (`project.html`),
  and the Void (`index.html`) are not part of this PRD.

## Further Notes

- The dead-CSS issue (the `@media (max-width: 430px)` block being overridden by
  a later `@media (max-width: 640px)` block) is the quiet driver of half the
  visible bug, not a side cleanup. Any implementation that doesn't reorder the
  blocks will silently undo its own phone tuning.
- The trim swap intentionally duplicates copy into two `<span>` siblings rather
  than reading the short variant from a `data-*` attribute or rewriting the
  DOM from JS. The duplication is visible in `about.html`, which is exactly
  where a future editor will look when changing copy — better than a quiet
  swap in script. ADR 0003 records this trade-off.
- No issue tracker is configured for this repo. If one is added later, this
  PRD is the source to paste from; a `ready-for-agent` triage label is the
  expected starting state.
