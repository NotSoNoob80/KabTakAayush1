# 0003 — The Listing keeps its scrub on phones (trimmed copy, not the stacked fallback)

- Status: Accepted
- Date: 2026-06-14

## Context

The About page (the **Listing**, `about.html`) is a scroll-pinned scrub: a
`460vh` track with a sticky viewport, and `listing.js` scrubs four classifieds
**cards** through their states. That scrub *is* the page's identity (see
[CONTEXT.md](../../CONTEXT.md)).

On phones the cards were clipping their content. Each `.listing__card` has
`overflow: hidden` and a height bound to the stage; the longest body **status**
(Makaan's ~70-word paragraph) renders taller than a phone-height card at a
readable size, so its bottom was cut off.

A static stacked layout already exists — the `prefers-reduced-motion` fallback,
which drops the pin, stacks the cards vertically, and shows everything. Reusing
that layout for *all* phones would have fixed the clipping for free.

We faced a genuine fork: on phones, **keep the scrub and make a card fit**, or
**reuse the existing stacked fallback** and drop the animation on mobile.

## Decision

Phones keep the scrub. To make a card fit a phone-height frame we instead:

- show a **trimmed status** — a short one-line variant of each card's copy,
  toggled by media query (the full paragraph is hidden on phones), and
- shrink the stage / card to the visible viewport.

The `prefers-reduced-motion` stacked layout remains the **only** static layout;
it is not extended to cover phones generally.

## Consequences

- The signature scroll experience is preserved on the most common way the site
  is viewed (mobile), rather than being a desktop-only treat.
- **Two copies of each card's status exist** in `about.html` (full + short),
  toggled by CSS. A future editor must update both, or accept that phones and
  desktop read differently. This is the surprising part the ADR exists to
  explain.
- Phones and `prefers-reduced-motion` now diverge: a phone with reduced motion
  gets the stacked layout; a phone without it gets the trimmed scrub. Both show
  all content, so this is acceptable.
- The trim is **CSS-only** — `listing.js` still targets the single
  `.listing__status` element, so the motion code is untouched and the
  CSS/JS-must-change-together coupling from
  [ADR 0001](0001-responsive-switches-on-width-not-pointer.md) does not extend
  to the copy trim.
- Reversing this (switching phones to the stacked fallback later) means removing
  the short copy and the phone sizing work — non-trivial once shipped.

See [docs/about-phone-fit-plan.md](../about-phone-fit-plan.md) for the
implementation plan this decision drives.
