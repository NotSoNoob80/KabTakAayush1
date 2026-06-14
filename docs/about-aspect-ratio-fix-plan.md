# Plan — Fix the About page loading "zoomed-out / tablet-width" on phones

- Status: Proposed
- Date: 2026-06-14
- Scope: `styles.css` (and possibly `about.html` markup). **`listing.js` is not
  touched** — consistent with [ADR 0003](adr/0003-listing-keeps-scrub-on-phones.md).
- Reported on: Nothing Phone 2a (Android Chrome), CSS viewport ≈ 411 × 891.
- Diagnosis method: **Chrome DevTools device emulation only** (~411 × 891). No
  on-device remote debugging available for this pass.

## Symptom

Opening `about.html` on the phone, the **whole page** first renders
zoomed-out — nav, the Listing card, and the footer all look tablet-proportioned,
as if the page were laid out for a much wider screen and then shrunk to fit. A
single scroll (e.g. down to the footer and back up) **snaps it to the correct
phone layout**, and it stays correct after that.

This is distinct from the copy-clipping bug already fixed in v5 (see
[about-phone-fit-plan.md](about-phone-fit-plan.md)). That work (dvh viewport,
reordered `640 → 430 → 360` breakpoints, trimmed copy) is shipped and is **not**
the cause here.

## Root cause (working theory)

**Android Chrome "shrink-to-fit."** When page content is wider than the device
width during the first layout pass, Chrome widens the *layout (CSS) viewport* to
fit the overflow and zooms the whole page out — exactly the "tablet view" look.
The first scroll collapses the URL bar and fires a `resize`, which forces a
reflow; if the offending overflow has resolved by then, the layout viewport
snaps back to true device width → the page corrects. That round-trip is the
"scroll fixes it" behaviour.

Two facts narrow this to a **static horizontal-overflow** cause (not the motion
code):

1. `html` has `overflow-x: hidden` ([styles.css:34](../styles.css)) but `body`
   does **not**. On Android, `overflow-x: hidden` on `html` alone hides the
   scrollbar but does **not** reliably stop the layout viewport from widening to
   contain overflowing children.
2. The card tilt (`rotScale` in `listing.js`) *does* swing card corners past
   `100vw`, but those are clipped by `.listing__viewport { overflow: hidden }`
   ([styles.css:1792](../styles.css)) — so the tilt is **not** a page-level
   overflow source. `listing.js` is therefore presumed innocent and left
   untouched.

### Prime suspect — the footer wordmark

`.footer__wordmark` uses **negative horizontal margins** to bleed edge-to-edge:
`margin: 88px -48px 28px` ([styles.css:2264](../styles.css)), reduced to
`-24px` on phones ([styles.css:932](../styles.css)), at
`font-size: clamp(40px, 18vw, 108px)` with crammed `-0.12em` per-letter margins.
Its own `overflow: hidden` ([styles.css:2279](../styles.css)) clips the *letters*
inside it, but the **element box itself** still extends 24px past each side of
its parent. It only stays within `100vw` if `.footer`'s horizontal padding is
≥ 24px; if not, the element pokes past the viewport edge and triggers
shrink-to-fit. The fact that the user notices the correction *at the footer* fits
this being the overflow source.

### Secondary suspects (to rule out in the hunt)

- `.listing__stage` base width `min(135vmin, 2000px)`
  ([styles.css:1803](../styles.css)) is wider than the viewport by design; it is
  reined by `@media (max-width: 980px)` ([styles.css:1815](../styles.css)). If
  the *first paint* briefly evaluates at a wide layout viewport, the un-reined
  base value feeds the overflow loop. Verify it can never exceed `100vw` once the
  phone breakpoints apply.
- `.listing__outro-stamp` — large display type (`clamp`-bounded, looks safe).
- Any other element with a negative horizontal margin or an un-clamped `vw`
  width on `about.html`.

## Diagnostic step (do this first)

In Chrome DevTools, emulate ~411 × 891 (Nothing 2a) and, on `about.html`, run:

```js
// Anything wider than the viewport is a shrink-to-fit trigger.
const docW = document.documentElement.clientWidth;
[...document.querySelectorAll('*')]
  .filter(el => el.getBoundingClientRect().right > docW + 1
             || el.getBoundingClientRect().left < -1)
  .map(el => ({ el, w: Math.round(el.getBoundingClientRect().width) }));
```

Also check `document.documentElement.scrollWidth > document.documentElement.clientWidth`.
Record every offender; the fix targets each one. Re-run after each change until
the list is empty at 320, 360, 411, and 430 px wide.

> Emulation caveat: DevTools reproduces the *width* overflow reliably but not the
> device's URL-bar show/hide timing. The hardening below is written to remove the
> overflow entirely so the timing race can't surface, rather than to depend on
> reproducing it.

## Changes (CSS / markup only)

### A. Contain overflow at the `body` level

Back up the existing `html` clip so the layout viewport can't widen:

```css
body {
  overflow-x: clip;   /* clip > hidden: no scroll container, no extra paint */
  max-width: 100%;
}
```

(Keep `html { overflow-x: hidden }` as the legacy fallback for engines without
`clip`.)

### B. Stop the footer wordmark from poking past the viewport

Keep the edge-to-edge *look* but guarantee the element never exceeds `100vw`.
Preferred: wrap the bleed in a container that clips, or constrain the element:

```css
.footer__wordmark {
  max-width: 100vw;          /* never wider than the viewport */
}
/* and ensure the parent .footer's horizontal padding ≥ the negative margin,
   or give .footer { overflow-x: clip } so the bleed is contained, not exported. */
```

Confirm in the hunt whether the `-24px` (phone) / `-48px` (desktop) bleed is
actually escaping `.footer`'s padding box; only tighten the margin if clipping
the parent isn't enough. The visual intent (dense, edge-to-edge signature) is
preserved — we're containing the bleed, not removing it.

### C. Guard the base stage width against a wide first paint

Make the un-reined desktop base value incapable of overflowing a phone even for
one frame:

```css
.listing__stage { max-width: 100vw; }   /* belt over the existing min(135vmin,…) */
```

This is harmless on desktop (the stage is already ≤ viewport there) and removes
the base value from the first-paint overflow loop.

## Out of scope

- Desktop / tablet (≥ 641px) layout, copy, and the card-tilt crop — unchanged.
- `listing.js` — **not modified**. The card-tilt overflow is already clipped by
  `.listing__viewport`; the page-level zoom is a CSS overflow problem.
- The v5 phone-fit work (dvh, breakpoint order, trimmed copy) — unchanged; this
  builds on top of it.
- `prefers-reduced-motion` stacked fallback — unchanged.

## Verification matrix

Reproduce the *before* state first (confirm the overflow-hunt query returns
offenders and the page renders zoomed-out), apply A–C, then confirm:

| Width | Why |
|-------|-----|
| 320 px | Narrowest small Android — worst case for wordmark/stage overflow |
| 360 px | Common older Android |
| 411 px | **Nothing 2a — the reported device** |
| 430 px | Largest phone |

For each width:

- [ ] Overflow-hunt query returns **zero** elements past the viewport edge.
- [ ] `documentElement.scrollWidth === clientWidth` (no horizontal scroll).
- [ ] Page renders at correct phone proportions **on first paint** — no
      zoomed-out / tablet flash before any scroll.
- [ ] After scrolling down to the footer and back, layout is unchanged (i.e. the
      first paint already matched the post-scroll state).
- [ ] Footer wordmark still reads edge-to-edge; no letters lost beyond the band.
- [ ] Listing scrub, SOLD stamp, and outro still behave as before.

> The first-paint check is the real acceptance test. If emulation can't surface
> the URL-bar timing, an empty overflow list at every width above is the proxy:
> with nothing exceeding `100vw`, Chrome has no reason to shrink-to-fit.

## Notes

- No ADR: this is a bug fix (remove unintended horizontal overflow), not a
  hard-to-reverse architectural trade-off with genuine alternatives.
- `CONTEXT.md` is unchanged: it is the site's *glossary*, and a browser
  shrink-to-fit bug name is not site vocabulary.
- If the on-device behaviour persists after A–C (i.e. emulation was clean but the
  Nothing 2a still flashes), the next escalation is on-device remote debugging
  (`chrome://inspect`) to catch a *dynamic* overflow that only exists during the
  URL-bar transition — out of scope for this emulation-only pass.
