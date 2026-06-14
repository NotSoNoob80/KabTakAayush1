# Plan — Make the About (Listing) page fit phones

- Status: Proposed
- Date: 2026-06-14
- Scope: `about.html`, `styles.css`, possibly `listing.js`
- Target devices: **320–430px wide, down to 667px tall.** Binding constraint is
  iPhone SE (375×667) — the shortest viewport has the least room for card copy.

## Goal

On phones the Listing should keep its scroll-pinned scrub (it is *not* swapped
for the stacked reduced-motion fallback — see [CONTEXT.md](../CONTEXT.md)), but
every card must show **all of its content + its corner illustration, centred,
with nothing clipped**. Today the cards were sized for desktop and the long
body copy overflows the card's `overflow: hidden` box.

## Decisions already locked (from the grilling session)

1. **Keep the scrub on phones**, size things to fit — do not fall back to the
   static stacked layout.
2. **Trim the body copy on phones** — show a short one-line **status** per card
   instead of the full lorem paragraph (the copy is placeholder filler).
3. **Target 320–430px wide, ≥667 tall**; SE 375×667 is the case to satisfy.
4. **Include the dvh viewport fix** and the **nav-overlap guard**.

## Root causes

1. **Copy overflow (the headline bug).** `.listing__card` has
   `overflow: hidden` and its height is bound to `.listing__stage`
   (`min(86vh, 760px)` at ≤640px — [styles.css:2104](../styles.css)). Makaan's
   ~70-word paragraph alone renders taller than the available card height at a
   readable size, so the bottom of the copy is clipped.
2. **Dead phone CSS (cascade-ordering bug).** The `@media (max-width: 430px)`
   block at [styles.css:917](../styles.css) sets `.listing__card { padding: 34px
   26px }` and `.listing__card--makaan .listing__status { max-width: 74% }`, but
   the `@media (max-width: 640px)` block at [styles.css:2103](../styles.css)
   sits **later** in the file and also matches at ≤430px. Equal specificity →
   later source order wins → the 430px tuning never applies.
3. **`100vh` sticky viewport.** `.listing__viewport { height: 100vh }`
   ([styles.css:1812](../styles.css)). On phones the address bar collapsing
   changes `100vh`, shifting the centred card — the "jumpy / made for a bigger
   screen" feel.
4. **Fixed nav overlap.** `.nav` is `position: fixed; height: var(--nav-h);
   z-index: 100` ([styles.css:105](../styles.css)). A card centred in `100vh`
   can tuck its title under the nav on a short phone (SE).
5. **Illustration crowding.** Corner art is sized as a % of the card (mandala
   `76%` with overhang, house `40%`). On a small card with trimmed copy this is
   mostly fine, but must be re-verified so art reads without covering the title.

## Changes

### A. Trim the copy — markup + CSS toggle (no JS coupling)

Inside each `.listing__status`, wrap the existing paragraph and add a short
sibling, toggled purely by media query:

```html
<p class="listing__status">
  <span class="status-full">In stock, no waitlist — the easy one … (full copy)</span>
  <span class="status-short">In stock, no waitlist — the easy one.</span>
</p>
```

- Keep the single `.listing__status` element so `listing.js`'s parallax
  (`c.querySelector('.listing__status')`, [listing.js:163](../listing.js)) still
  finds it untouched — both spans move together. **No JS change needed.**
- Default: `.status-short { display: none }`.
- On phones: `.status-full { display: none }` / `.status-short { display: inline }`.

Proposed short copy (keeps each card's punchline, drops the lorem):

| Card   | Short status |
|--------|--------------|
| Roti   | In stock, no waitlist — the easy one. |
| Kapda  | Sale rack, but it still counts. |
| Makaan | EMI: 847 years, give or take a generation. |
| Art    | Priceless — ask anyone who isn't buying. |

### B. Consolidate + fix the phone breakpoints

Reorganise the Listing's mobile rules so **narrower = later in the file** (so the
most specific breakpoint wins by source order, per the cascade note in
[ADR 0001](adr/0001-responsive-switches-on-width-not-pointer.md)). Target order:

1. `@media (max-width: 640px)` — base phone layout.
2. `@media (max-width: 430px)` — refinements **after** the 640px block.
3. (optional) `@media (max-width: 360px)` — smallest Androids / SE width edge.

On phones let the trimmed status use the card's width: `.listing__status { max-width: 100% }`
(both the generic and the Makaan-specific override), since the short line no
longer needs a narrow measure.

### C. Size cards to fit + stay centred

- Reduce `.listing__card` padding on phones so the content area is larger
  (≈`28px 22px` at ≤430).
- Lower the title floor so "Makaan" can't overflow width at 320px:
  `font-size: clamp(48px, 14vmin, 184px)` (verify on 320).
- Stage height on phones derived from the **visible** height (see D) minus nav,
  e.g. `height: min(70dvh, 700px)`; width `min(92vw, 520px)`.
- Card stays centred via its existing `left/top: 50%` + `translate(-50%,-50%)`.

### D. dvh viewport fix

```css
.listing__viewport {
  height: 100vh;      /* fallback for browsers without dvh */
  height: 100dvh;     /* stable under mobile address-bar show/hide */
}
```

`.listing__pin` height (`460vh`) stays in `vh` — it only sets scroll *length*
(pacing), and `dvh` there would make the runway resize mid-scroll.

### E. Nav-overlap guard

On phones, add top room equal to the nav so the centred card never hides under
it:

```css
@media (max-width: 640px) {
  .listing__viewport { padding-top: var(--nav-h); }
}
```

Because the viewport is a centring flex column, the padding shrinks the centring
box and pushes the card below the nav. Verify the card still reads as centred in
the remaining space on SE.

### F. Illustration placement check

After A–E, verify on each card that the corner illustration is visible and does
**not** sit on top of the (now short) status line. If the mandala (`76%`,
overhanging) or house (`40%`) crowds the copy on the smallest sizes, nudge their
widths down ~10% within the phone breakpoint. Opacity unchanged.

## Out of scope

- Desktop / tablet (≥641px) layout — unchanged.
- `prefers-reduced-motion` stacked fallback — unchanged (still the only static
  layout).
- The scrub timeline values, snap-to-beat, and `rotScale` damp in `listing.js`
  — unchanged (the `rotScale` 0.5 at ≤980px already keeps tilted corners
  on-screen).

## Verification matrix

Test every card (Roti, Kapda, Makaan, Art) plus the SOLD stamp and outro at:

| Device            | Size     | Why |
|-------------------|----------|-----|
| Small Android     | 320×640  | Narrowest width — title/horizontal overflow |
| Android / old     | 360×640  | Common Android |
| **iPhone SE**     | **375×667** | **Shortest — binding constraint for copy fit** |
| iPhone 12–15      | 390×844  | Most common iPhone |
| Pixel             | 393×852  | Common Android |
| Pro Max / Plus    | 430×932  | Largest phone |

For each, confirm:

- [ ] All of title, price, (trimmed) status, and illustration are visible — no clipping.
- [ ] Card is centred; no content under the fixed nav.
- [ ] No horizontal page scroll.
- [ ] Scrub still drives the four cards; snap-to-beat still settles.
- [ ] No visible jump when the address bar shows/hides (dvh).
- [ ] SOLD stamp + house crumble still land on Makaan within the card.
- [ ] `prefers-reduced-motion` still shows the stacked static layout.

## Open question

Whether to record the "keep the scrub + trim copy on phones (don't reuse the
reduced-motion stack)" choice as an ADR — see the offer at the end of the
session.
