# 007 — Preview: finger-tracking swipe with directional continuity

- **Status**: TODO
- **Commit**: 62fd172
- **Severity**: MEDIUM impact, the largest bite of the batch (from `find-animation-opportunities`)
- **Category**: Spatial consistency + Feedback (gesture seam)
- **Estimated scope**: 2 files (mosaic.js MosaicPreview, styles.css preview block)

## Problem

The full-screen preview is the core browsing loop, and on touch its swipe is a
threshold detector — nothing moves while the finger drags; on release the next frame
fades in:

```js
/* mosaic.js:169–184 — current: measure-only swipe, no follow */
      overlay.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) { touchActive = false; return; }
        touchActive = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      overlay.addEventListener('touchend', function (e) {
        if (!touchActive) return;
        touchActive = false;
        var t = e.changedTouches[0];
        var dx = t.clientX - touchStartX;
        var dy = t.clientY - touchStartY;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.6) {
          go(dx < 0 ? 1 : -1);
        }
      }, { passive: true });
```

A draggable surface that doesn't track the finger reads as unresponsive, and the swap
itself has no directional story — swiping left and pressing → both produce the same
in-place fade (the `is-media-enter` fade from plan 005, mosaic.js:258–266).

Gate: **occasional** frequency (browsing a gallery), purpose **spatial consistency +
feedback**, budget kept (spring-back ≈300ms, entrance 220ms), and it's direct
manipulation on media being *viewed*, not data being read — passes all four.

## Target

Three cooperating pieces. Everything is gated on `!reducedMotion` (the flag already in
scope at mosaic.js:111–112); under reduced motion, today's threshold swipe with instant
swap remains byte-identical.

### 1. Directional entrance (touch AND arrow keys) — CSS + 3 JS lines

The incoming frame slides a small step from the direction of travel while it fades.
Extend the plan-005 classes in styles.css (currently at ~2617):

```css
/* current */
.mosaic-preview__stage .is-media-enter {
  opacity: 0;
}

.mosaic-preview__stage .is-media-enter.is-media-ready {
  opacity: 1;
  transition: opacity 180ms var(--ease-out);
}
```

```css
/* target — --enter-dx is set on the stage by JS per navigation (one-time
   write, not per-frame, so the parent-variable style-recalc concern does
   not apply); 0 when direction is unknown (open, reduced motion). */
.mosaic-preview__stage .is-media-enter {
  opacity: 0;
  transform: translateX(var(--enter-dx, 0px));
}

.mosaic-preview__stage .is-media-enter.is-media-ready {
  opacity: 1;
  transform: translateX(0);
  transition: opacity 180ms var(--ease-out), transform 220ms var(--ease-out);
}
```

In mosaic.js `go(delta)` (currently ~262), record the direction before rendering:

```js
    var go = function (delta) {
      if (media.length <= 1) return;
      cancelHint();
      /* Directional continuity: the incoming frame steps in from the side
         the navigation came from. 24px — felt, not seen. */
      if (!reducedMotion && stage) stage.style.setProperty('--enter-dx', (delta > 0 ? 24 : -24) + 'px');
      var n = media.length;
      render(((currentIndex + delta) % n + n) % n, true);
    };
```

No change to `render`/`mount` — the classes it already applies pick the variable up.

### 2. Finger tracking while dragging — JS

Replace the two touch listeners quoted above with a drag-follow version. Rules it must
implement:

- **Intent lock**: the gesture claims horizontal only once `|dx| > |dy|` and `|dx| > 8px`;
  a vertical-first drag never moves the frame.
- **Video frames are exempt**: if `previewVideo` is non-null (the stage shows a video
  with native controls), keep today's threshold behavior — dragging must not fight the
  control bar. Only image frames track the finger.
- **Resistance**: the frame moves at `0.55 ×` finger delta (`transform: translateX()`
  inline on the stage child, `transition: 'none'` while dragging) — rubber, not 1:1.
- **Release — navigate** when `|velocity| > 0.11 px/ms` (px moved ÷ ms elapsed over the
  last ~100ms of the drag) **or** `|dx| > 30%` of the stage width: clear the inline
  transform/transition and call `go(dx < 0 ? 1 : -1)`. The plan-005 machinery holds the
  old frame until the incoming one is ready, and the directional entrance (piece 1)
  carries the motion story — do NOT animate the old frame out separately (that would
  reintroduce the blank-stage gap plan 005 removed).
- **Release — spring back** otherwise, with WAAPI (the Glissando's pattern,
  script.js:227–238, is the repo exemplar):

```js
        node.animate(
          [{ transform: 'translateX(' + currentOffset + 'px)' }, { transform: 'translateX(0)' }],
          { duration: 300, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
        );
        node.style.transform = '';
        node.style.transition = '';
```

  WAAPI keeps the spring interruptible — a new touch mid-spring simply starts a new drag.
- All of this sits inside `if (!reducedMotion) { … } else { /* current listeners,
  verbatim */ }`.

### 3. Keyboard arrows inherit the direction

Nothing extra — the arrows already route through `go()`, so piece 1 gives ArrowRight a
from-the-right entrance automatically. Verify only.

## Repo conventions to follow

- Spring curve `cubic-bezier(0.34, 1.56, 0.64, 1)` and the WAAPI press pattern:
  script.js:194–238.
- Fade/duration family: 180ms/220ms `var(--ease-out)` (styles.css preview block).
- `reducedMotion` flag: reuse mosaic.js:111–112, don't re-query.
- ES5 style (`var`, function expressions), matching the file.

## Boundaries

- MosaicPreview only. Do NOT touch the grid, MosaicMotion, the Spotlight, or plan-005's
  `render`/`mount` internals (only `go` gains the one `--enter-dx` line).
- Do NOT animate the outgoing frame on dismiss (see rule above).
- Do NOT attach drag-follow to video frames.
- Under reduced motion, behavior must remain byte-identical to today.
- If the quoted excerpts no longer match (drift since 62fd172), STOP and report.

## Verification

- **Mechanical**: `node --check mosaic.js` (or load the page — console must be clean).
- **Feel check** (DevTools device emulation + a real phone if possible):
  - Drag an image frame slowly left/right: it follows the finger at ~half speed and
    springs back with a soft overshoot when released early.
  - Flick fast: navigates even on a short flick (velocity path); slow long drag past
    ~30% width navigates too (distance path). The incoming frame slides in from the
    direction of the flick while fading.
  - Drag mostly vertically: the frame must not move horizontally (intent lock).
  - On a video frame: dragging does nothing special; the control bar works; the old
    threshold swipe still flips frames.
  - Arrow keys on desktop: next frame steps in from the right, previous from the left.
  - Spam navigation while dragging/spring-back: no stuck offsets, no blank stage
    (plan-005's token machinery must remain intact).
  - Rendering panel → reduced motion: drag-follow, spring, and slide are all gone;
    threshold swipe with instant swap works exactly as before.
- **Done when**: images track the finger with resistance, releases resolve by velocity
  or distance, entrances carry direction on both touch and keyboard, videos and
  reduced-motion are untouched.
