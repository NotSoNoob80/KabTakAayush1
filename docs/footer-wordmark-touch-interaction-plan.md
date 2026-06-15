# Plan — Footer wordmark touch interaction

## Problem

On touch devices, long-pressing the **footer wordmark** (the decorative
`KabTakAayush` mark in the page footer) triggers the browser's native
text-selection callout — the "Copy / Search with Google" menu. The letters are
real selectable text with no `user-select` / `-webkit-touch-callout`
suppression, so the OS treats a long press as "select this text." It reads as
janky and unintentional.

Today's touch experience for the mark:

- **Scroll-in:** a one-shot gold shimmer ripple plays once
  ([script.js:124](../script.js)).
- **Tap:** nothing — the hover/gold rules are deliberately neutralised on
  coarse pointers ([styles.css:965](../styles.css)).
- **Long-press:** native selection callout fires. ← the jank.

The mark is `<p class="footer__wordmark footer__wordmark--piano"
aria-hidden="true">` on all three footer pages: [about.html:237](../about.html),
[projects.html:180](../projects.html), [project.html:78](../project.html).
[script.js:109](../script.js) splits it into `<span class="char">` letters.

## Decision (after grilling)

Don't just kill the jank — give touch a deliberate, in-keeping reward. The mark
already ships the `--piano` variant (a per-letter press-down ripple) that
currently *only works on desktop hover*. We make that interaction real on touch.

| # | Decision | Choice |
|---|----------|--------|
| 1 | Intent | **Suppress the long-press callout AND add a tap reward** |
| 2 | Reward | **Per-letter piano press** — reuse the `--piano` press aesthetic |
| 3 | Press model | **Glissando** — letters press live as the finger slides across them; drag horizontally and you "play" the word |
| 4 | Scroll vs play | **`touch-action: pan-y`** — browser keeps owning vertical scroll; we only ever receive horizontal gestures. No `preventDefault`, no axis math |
| 5 | Reduced motion | **Suppress only** — callout suppression still applies (it's a fix, not motion); the glissando never runs |

New glossary term **Glissando** added to [CONTEXT.md](../CONTEXT.md).

## What we build

### 1. Suppress the native callout (CSS, global)

On `.footer__wordmark` (it is `aria-hidden` and purely decorative — selecting it
serves no purpose on any device):

```css
.footer__wordmark {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none; /* kills the iOS "Copy / Search with Google" menu */
  touch-action: pan-y;         /* browser owns vertical scroll; we get horizontal play */
}
```

Applied globally rather than behind a touch media query: `-webkit-touch-callout`
only affects touch anyway, and `user-select: none` also prevents accidental
desktop drag-select of the decorative mark. This single block also fixes the
core bug on its own.

### 2. The press animation (CSS)

A new **self-completing** keyframe that mirrors the existing `--piano` press
transform (`translateY` down + `scaleY` squash + gold), but plays press-down →
spring-back on its own rather than depending on `:hover` being held. Driven by a
JS-applied class, not a pseudo-class:

- `.footer__wordmark .char.is-press` — full press on the crossed letter.
- `.footer__wordmark .char.is-press-near` — softer, shallower press on the
  immediate neighbours (the existing `--piano` ripple falls off across ±1/±2;
  we mirror that with the `near` class added to siblings).

The class is removed on `animationend` (fallback: a short `setTimeout`), so each
letter is free to re-fire when the finger crosses it again.

Reduced-motion: the existing `@media (prefers-reduced-motion: reduce)` block
([styles.css:2504](../styles.css)) is extended to also neutralise `.is-press` /
`.is-press-near`, so the glissando is inert for those users while suppression
(step 1) still holds.

### 3. The glissando driver (JS, in the existing wordmark block)

Added near the touch shimmer setup ([script.js:124](../script.js)). Gated to
touch / coarse pointers; desktop keeps the richer `:hover` interaction
untouched.

- Use **Pointer Events** (`pointerdown` / `pointermove` / `pointerup` /
  `pointercancel`), filtered to `event.pointerType === 'touch'` (or the existing
  coarse-pointer check `wordmarkIsTouch`).
- On `pointerdown` over the mark: press the letter under the finger (so a plain
  tap with no movement still plays one key).
- On `pointermove`: hit-test with `document.elementFromPoint(x, y)` →
  `.closest('.char')`. Track the **last pressed char**; only fire when the
  finger enters a *different* char (no re-fire while stationary on one letter).
  Re-entering a letter re-fires it.
- Firing a letter = add `.is-press` to it and `.is-press-near` to its immediate
  siblings.
- On `pointercancel` (the browser took the gesture for vertical scroll, thanks
  to `touch-action: pan-y`) or `pointerup`: reset the last-char tracker. No
  cleanup of `.is-press` needed — `animationend` handles that.
- Skip the whole driver when `prefersReducedMotion` is true.

`elementFromPoint` is chosen over precomputed per-char bounding boxes so the
hit-testing survives reflow (font loading, viewport resize) with no cache to
invalidate.

### Scope

All three footer pages share [script.js](../script.js) and
[styles.css](../styles.css), so the change lands everywhere automatically. The
existing scroll-in shimmer is left exactly as-is.

## Out of scope / explicitly not doing

- No egg-line popups on tap (considered; rejected to keep the reward tactile,
  not textual).
- No JS axis detection / `preventDefault` scroll handling — `touch-action: pan-y`
  makes it unnecessary and removes the risk of sticky scroll.
- Desktop hover behaviour is untouched.

## Verification

On a touch device / emulator across about, projects, and project pages:

1. **Long-press the mark** → no "Copy / Search with Google" callout. *(core fix)*
2. **Tap a letter** → it presses and springs back, neighbours dip slightly.
3. **Slide horizontally across the mark** → each letter plays as the finger
   crosses it (glissando).
4. **Drag vertically on the mark** → the page scrolls normally; no stuck/lifted
   letters.
5. **With reduced motion on** → no press animation, but long-press still
   produces no callout.
6. **Desktop** → per-letter hover press unchanged.

## ADR?

Not warranted. The change is localised to one decorative component and is cheap
to reverse (delete the CSS block + JS driver). The one mildly surprising choice
for a future reader — `touch-action: pan-y` on the wordmark, and pointer-tracking
code on an `aria-hidden` element — is explained inline here and by the
**Glissando** entry in [CONTEXT.md](../CONTEXT.md). The existing responsive ADR
([0001](adr/0001-responsive-switches-on-width-not-pointer.md)) already covers the
broader small-screen philosophy.
