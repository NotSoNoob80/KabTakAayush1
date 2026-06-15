# PRD — Footer wordmark touch interaction (Glissando)

## Problem Statement

On touch devices, long-pressing the footer wordmark (the decorative
`KabTakAayush` mark at the bottom of about, projects, and project pages) pops
up the OS text-selection callout — the "Copy / Search with Google" menu. The
letters are real selectable text with no suppression, so the system treats a
long press as "select this text." It reads as janky and unintentional on a
purely decorative element.

There is also a secondary gap: touch users get no reward at all from the
mark. The scroll-in gold shimmer plays once, and after that the mark is
inert on coarse pointers, while desktop users get a rich per-letter piano
press on hover. Touch is the orphan of the three states.

## Solution

Two changes that ship together:

1. **Suppress the native callout** on the footer wordmark across all
   pages — it is `aria-hidden` and decorative, so selecting it serves no
   purpose anywhere.
2. **Give touch its own reward — the Glissando.** Reuse the existing
   `--piano` press aesthetic, but trigger it from finger movement rather
   than `:hover`. Sliding a finger horizontally across the mark "plays"
   each letter it crosses like a piano key; a plain tap plays the letter
   under the finger. Vertical drags still scroll the page normally — the
   browser keeps owning vertical gestures via `touch-action: pan-y`.

Under `prefers-reduced-motion` the Glissando does not run, but the callout
suppression still holds — the long-press fix is not motion, it is correctness.
Desktop hover behaviour is untouched.

## User Stories

1. As a touch visitor on any footer page, I want long-pressing the footer
   wordmark to do nothing visible, so that I am not interrupted by an
   unwanted "Copy / Search with Google" callout on a decorative element.
2. As a touch visitor on the About page, I want tapping a letter of the
   footer wordmark to press that letter and spring it back, so that the
   mark feels alive to my touch.
3. As a touch visitor on the Projects index, I want the same tap reward on
   the footer wordmark there, so that the interaction is consistent across
   pages.
4. As a touch visitor on a project Mosaic, I want the same tap reward on
   its footer wordmark, so that the interaction is consistent everywhere
   the mark appears.
5. As a touch visitor, I want sliding my finger horizontally across the
   wordmark to play each letter as I cross it, so that the mark behaves
   like a tiny piano under my fingertip.
6. As a touch visitor, I want immediate neighbours of a played letter to
   dip slightly, so that the press has the same ripple feel as the desktop
   hover press.
7. As a touch visitor, I want a letter to re-fire when my finger leaves it
   and comes back, so that scrubbing back and forth keeps producing notes
   instead of going silent.
8. As a touch visitor, I want a letter to stay quiet while my finger
   rests on it without moving, so that the mark does not strobe under a
   stationary touch.
9. As a touch visitor, I want dragging vertically on the wordmark to
   scroll the page as normal, so that the decorative element never traps
   my scroll.
10. As a touch visitor mid-Glissando who then scrolls vertically, I want
    the gesture to hand off to the browser cleanly with no stuck or
    half-pressed letters left behind.
11. As a visitor who has `prefers-reduced-motion` enabled, I want the
    long-press callout suppressed but no glissando animation to play, so
    that the bug fix still benefits me without imposing motion I opted out of.
12. As a desktop visitor, I want my per-letter hover press on the
    wordmark to be exactly as it was before, so that the change does not
    regress the existing interaction I already know.
13. As a desktop visitor, I want the wordmark not to be accidentally
    drag-selectable as text, so that I do not highlight a decorative mark
    while trying to select nearby content.
14. As a visitor on any device, I want the scroll-in gold shimmer of the
    wordmark to play exactly as it did before, so that the change is
    additive, not a replacement.
15. As a future maintainer reading the code, I want the new vocabulary
    ("Glissando") to be defined in `CONTEXT.md`, so that the unusual
    pointer-tracking code on an `aria-hidden` element makes sense.
16. As a future maintainer, I want the touch behaviour gated by the
    existing coarse-pointer check rather than a new one, so that the
    site has one consistent definition of "touch."

## Implementation Decisions

### Surface area

- The footer wordmark is the same element on all three footer pages
  (`<p class="footer__wordmark footer__wordmark--piano" aria-hidden="true">`
  on the About page, the Projects index, and the project Mosaic). Both
  `styles.css` and `script.js` are shared by all three, so the change
  lands everywhere with a single edit set.
- The mark is already split into per-letter `<span class="char">` by the
  existing wordmark JS block.

### Module 1 — Callout suppression (CSS, `styles.css`)

A single declarative block on `.footer__wordmark`:

- `-webkit-user-select: none; user-select: none;` — prevents desktop
  drag-select and is the prerequisite for the iOS callout suppression.
- `-webkit-touch-callout: none;` — suppresses the iOS "Copy / Search with
  Google" callout. Touch-only effect even though it lives outside a media
  query.
- `touch-action: pan-y;` — declares to the browser that the element only
  responds to vertical pans. The browser keeps full ownership of vertical
  scrolling and emits `pointercancel` to us when it takes over, so we never
  need `preventDefault` or any JS axis arithmetic.

Applied globally — not behind a touch media query — because every clause
is either touch-only in effect or strictly beneficial on desktop.

### Module 2 — Press animation (CSS, `styles.css`)

A new self-completing keyframe that mirrors the existing `--piano` press
transform (down + squash + gold tint), but plays the full press-down →
spring-back arc on its own rather than holding while `:hover` is held.

Driven by JS-applied classes, not pseudo-classes:

- `.footer__wordmark .char.is-press` — full press on the struck letter.
- `.footer__wordmark .char.is-press-near` — softer, shallower press on
  the immediate neighbours, mirroring how the existing `--piano` ripple
  falls off across ±1 / ±2 siblings.

Each class is removed on `animationend` (with a short `setTimeout`
fallback) so a letter is free to re-fire next time the finger crosses it.

The existing `@media (prefers-reduced-motion: reduce)` block is extended
to neutralise both `is-press` and `is-press-near`, so the animation is
inert for reduced-motion users while the suppression block above still
holds.

### Module 3 — Glissando driver (JS, `script.js`)

Added inside the existing wordmark setup block (the same block that
splits the mark into `char` spans and runs the one-shot scroll-in
shimmer). Gated to the existing coarse-pointer check that the shimmer
already uses, so desktop is never wired up.

Pointer model — Pointer Events, filtered to `event.pointerType === 'touch'`
(in addition to the coarse-pointer gate):

- `pointerdown` on the mark → press the letter under the finger. A plain
  tap with no movement therefore plays exactly one key.
- `pointermove` → hit-test with `document.elementFromPoint(x, y)` and
  `.closest('.char')`. Track the **last-pressed char**; only fire when the
  finger enters a *different* char. Re-entering a previously played char
  re-fires it. A stationary finger does not strobe.
- `pointerup` and `pointercancel` → reset the last-char tracker. No
  cleanup of `is-press` classes — `animationend` already handles that, and
  `pointercancel` is exactly what fires when the browser hands the gesture
  off to vertical scroll.

Hit-testing is by `elementFromPoint`, not by precomputed per-char bounding
boxes. This survives reflow (font loading, viewport resize, orientation
change) with no cache to invalidate.

Firing a letter = add `is-press` to that `char` and `is-press-near` to its
immediate sibling `char`s on either side.

The whole driver short-circuits when `prefersReducedMotion` is true.

### Vocabulary

The term **Glissando** is added to `CONTEXT.md` so the unusual choice of
pointer-tracking code on an `aria-hidden` element is documented as
deliberate.

## Testing Decisions

This is a static portfolio site with no automated test framework. Verification
is manual, against the externally observable behaviour of the wordmark —
never against the JS internals (class names, last-char tracker, listener
identities).

Verification matrix, run on a touch device or a touch-emulating devtools
session, across each of the three footer pages (About, Projects index,
project Mosaic):

1. **Long-press the wordmark** → no "Copy / Search with Google" callout
   appears. *(Core bug fix; must hold on every page.)*
2. **Tap a single letter** → that letter presses and springs back; its
   neighbours dip more shallowly.
3. **Slide a finger horizontally across the wordmark** → each letter
   plays as the finger crosses it; the glissando is audible-feeling, not
   strobing.
4. **Rest a finger on a single letter** → that letter plays once on
   touchdown, then stays quiet until the finger moves to a different letter.
5. **Leave a letter and return to it** → the letter re-fires on
   re-entry.
6. **Drag vertically starting on the wordmark** → the page scrolls
   normally; no letter stays pressed; no jank on hand-off.
7. **With `prefers-reduced-motion` enabled** → no press animation runs,
   but long-press still produces no callout.
8. **Desktop, mouse pointer** → per-letter hover press is unchanged; the
   user cannot accidentally text-select the wordmark by drag.
9. **Scroll-in shimmer** → still plays exactly once on first reveal of
   each page's footer, unchanged.

Prior art for this style of "behavioural checklist against a decorative
animation": the verification block at the end of the original plan
([docs/footer-wordmark-touch-interaction-plan.md](../footer-wordmark-touch-interaction-plan.md))
follows the same pattern, and the existing `--piano` hover press on
desktop was validated the same way.

## Out of Scope

- No egg-line / textual popup on tap. Considered and rejected — the
  reward stays tactile, not verbal.
- No JS axis detection or `preventDefault`-based scroll handling.
  `touch-action: pan-y` makes both unnecessary and avoids the risk of
  sticky-scroll bugs.
- No change to desktop hover behaviour.
- No change to the scroll-in gold shimmer.
- No change to the wordmark pivot on the Projects index, the Void's
  frames, or any other interactive surface.
- No ADR. The change is localised to one decorative component, cheap to
  reverse, and the one mildly surprising choice (`touch-action: pan-y`
  plus pointer-tracking on an `aria-hidden` element) is captured inline
  in the plan plus the **Glissando** glossary entry. ADR 0001 already
  covers the broader small-screen philosophy.

## Further Notes

- The change is additive in the sense that the existing scroll-in
  shimmer, desktop hover press, and small-screen layout switches are all
  left untouched.
- "Touch" in the driver is gated by the same coarse-pointer check the
  existing wordmark shimmer block already uses, so the site retains a
  single definition of touch rather than introducing a parallel one.
- The PRD intentionally avoids naming specific line numbers and code
  snippets beyond the architectural classes (`is-press`, `is-press-near`)
  and the property choices (`touch-action: pan-y`, `-webkit-touch-callout`)
  that *encode* the decision. Implementation details should follow the
  current shape of `script.js` and `styles.css` at the time of build.
