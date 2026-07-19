# 005 — Stop the preview's prev/next hard cut: swap when ready, fade in

- **Status**: DONE (implemented + verified 2026-07-19; slow-network hold path verified by design, not exercised)
- **Commit**: f9a3ae9
- **Severity**: LOW (missed opportunity on a high-use surface)
- **Category**: Missed opportunities (jarring state change)
- **Estimated scope**: 2 files (mosaic.js, styles.css)

## Problem

Inside the full-screen mosaic preview, stepping with the arrows / arrow keys /
swipe replaces the stage content instantly:

```js
/* mosaic.js:198–202 — current */
    /* Render media[index] onto the stage, replacing whatever's there. */
    var render = function (index) {
      currentIndex = index;
      var item = media[index];
      stage.innerHTML = '';
```

The old frame vanishes the moment navigation fires, and the new one pops in
whenever it happens to decode — on a slow connection the visitor stares at an
empty dark stage, then the image slams in. Browsing a gallery is the core loop
of this page; the swap is the one teleport left in it. The site already has a
language for this (the tile grid fades media in; the overlay itself fades open
at mosaic.js:307–312) — navigation inside the preview should too.

The fix: on navigation, keep the current frame on stage until the incoming one
is actually displayable, then swap and fade the incoming frame up over 180ms.
The *first* render on open stays instant (the overlay's own entrance covers it).

## Target

### styles.css — one addition

Insert after the `.mosaic-preview__stage img, .mosaic-preview__stage video`
rule (styles.css:2605–2615), before the `accent-color` block:

```css
/* Frame-to-frame swap (arrows / keys / swipe): the incoming media mounts
   only once displayable, then fades up — navigation never flashes a blank
   stage or pops a half-decoded image. JS adds these classes only outside
   reduced motion; the hold-until-ready itself is loading correctness and
   applies in both modes. */
.mosaic-preview__stage .is-media-enter {
  opacity: 0;
}

.mosaic-preview__stage .is-media-enter.is-media-ready {
  opacity: 1;
  transition: opacity 180ms var(--ease-out);
}
```

### mosaic.js — replace `render` (198–258) and `go` (262–267), plus 2 lines

Replace the whole `render` function with:

```js
    /* Render media[index] onto the stage. Direct renders (open) swap
       immediately; deferred renders (prev/next navigation) hold the current
       frame until the incoming one is displayable, then fade it up — so
       stepping through the gallery never blanks the stage. `renderToken`
       makes rapid navigation last-write-wins: a superseded pending swap
       simply never mounts. */
    var renderToken = 0;
    var render = function (index, deferSwap) {
      currentIndex = index;
      var item = media[index];
      var token = ++renderToken;

      var node;
      if (item.kind === 'video') {
        node = document.createElement('video');
        node.src = item.src;
        node.controls = true;
        node.autoplay = true;
        node.loop = true;
        node.setAttribute('playsinline', '');
        node.setAttribute('preload', 'metadata');
        /* Drop the download entry from the controls' overflow menu — the
           work is for viewing here, not saving. */
        node.setAttribute('controlsList', 'nodownload');

        /* Inherit the inline tile's state so full screen is seamless:
           the same sound on/off, and resume from the same playback
           position. The opening click is a user gesture, so unmuted
           autoplay is permitted. Default to muted when there's no inline
           counterpart (satisfies autoplay; native controls let them unmute). */
        var sourceTile = findTileFor(node);
        node.muted = sourceTile ? sourceTile.muted : true;
        if (sourceTile) {
          var startAt = sourceTile.currentTime || 0;
          var seekToStart = function () {
            try { node.currentTime = startAt; } catch (e) { /* ignore */ }
          };
          /* Metadata may already be cached (the tile has been playing);
             otherwise wait for it so the seek actually takes. */
          if (node.readyState >= 1) seekToStart();
          else node.addEventListener('loadedmetadata', seekToStart, { once: true });
        }
      } else {
        node = document.createElement('img');
        node.src = item.src;
        node.alt = '';
        node.decoding = 'async';
      }

      var mounted = false;
      var backstop = 0;
      var mount = function () {
        if (mounted || token !== renderToken) return;   /* superseded or duplicate */
        mounted = true;
        if (backstop) { window.clearTimeout(backstop); backstop = 0; }
        stage.innerHTML = '';
        previewVideo = (item.kind === 'video') ? node : null;
        stage.appendChild(node);
        if (deferSwap && !reducedMotion) {
          /* Commit the hidden state before revealing — same reflow trick
             the overlay's own open uses (void overlay.offsetWidth). */
          node.classList.add('is-media-enter');
          void node.offsetWidth;
          node.classList.add('is-media-ready');
        }

        /* Kick playback off inside the tap/click gesture. Mobile browsers
           won't honour the `autoplay` attribute for an *unmuted* video, so
           without an explicit play() here the full-screen view loads paused.
           If the unmuted play is still refused, fall back to muted so it
           never sits frozen — the native controls let them unmute. */
        if (item.kind === 'video') {
          var playing = node.play();
          if (playing && typeof playing.catch === 'function') {
            playing.catch(function () {
              node.muted = true;
              var retry = node.play();
              if (retry && typeof retry.catch === 'function') retry.catch(function () {});
            });
          }
        }
      };

      if (!deferSwap) { mount(); return; }

      /* Deferred: mount once the frame is displayable. The 400ms backstop
         swaps regardless — worst case matches today's behavior — and keeps
         the video play() inside the user activation window. */
      backstop = window.setTimeout(mount, 400);
      if (item.kind === 'video') {
        if (node.readyState >= 2) mount();
        else {
          node.addEventListener('loadeddata', mount, { once: true });
          node.addEventListener('error', mount, { once: true });
        }
      } else {
        if (node.complete && node.naturalWidth) {
          mount();
        } else if (node.decode) {
          node.decode().then(mount, mount);
        } else {
          node.addEventListener('load', mount, { once: true });
          node.addEventListener('error', mount, { once: true });
        }
      }
    };
```

Replace `go` with:

```js
    /* Step the preview by ±1 with wraparound. Any deliberate navigation
       means the visitor already knows how to move — retire the cue. */
    var go = function (delta) {
      if (media.length <= 1) return;
      cancelHint();
      var n = media.length;
      render(((currentIndex + delta) % n + n) % n, true);
    };
```

And in `close` (mosaic.js:320–364), add one line right after `cancelHint();`:

```js
      renderToken++;   /* abandon any pending deferred swap */
```

Note `previewVideo = node` / `previewVideo = null` moves from build time into
`mount()` — that is deliberate: while a deferred swap is pending, `close()` must
read the video that is actually on stage, not the incoming one.

## Repo conventions to follow

- The forced-reflow-before-class idiom is the overlay's own:
  `void overlay.offsetWidth;` at mosaic.js:311.
- Fade duration/curve match the preview family: 180ms `var(--ease-out)`
  (the badge icon fade at styles.css:2350 uses the same pair).
- `reducedMotion` is the existing flag at mosaic.js:111–112 — reuse it, don't
  re-query.

## Steps

1. Add the CSS block from **Target** to styles.css after line 2615.
2. In mosaic.js, replace the `render` function (198–258) with the Target version.
3. Replace `go` (262–267) with the Target version.
4. Add the `renderToken++;` line to `close` immediately after its `cancelHint();`.

## Boundaries

- Do NOT change `open()` — first render stays immediate (`render(index)` with no
  second argument).
- Do NOT touch the hint scheduling, swipe thresholds, pause/resume bookkeeping,
  or the reduced-motion CSS block at styles.css:2805–2818 (the classes are never
  added under reduced motion, so it needs no addition).
- Do NOT introduce a two-node crossfade (stacking old + new); hold-then-fade only.
- If the excerpts no longer match (drift since f9a3ae9), STOP and report.

## Verification

- **Mechanical**: `node --check mosaic.js` exits clean.
- **Feel check**: serve the site, open `project.html?id=01`, click a tile, then:
  - Arrow through frames on a fast connection: each next frame fades up in
    ~180ms; the stage is never empty between frames.
  - DevTools → Network → throttle to "Slow 3G", navigate: the current frame
    holds until the next is ready (or 400ms worst case) — no blank stage, no
    pop-in slam.
  - Spam the right-arrow key: navigation stays responsive, frames never flash
    out of order, and the last pressed frame is the one that lands (token
    check).
  - Open a video frame, navigate to it and away: sound/position inheritance and
    inline-tile resume still behave exactly as before; close mid-navigation and
    reopen — no stale frame appears.
  - Rendering panel → emulate reduced motion: navigation swaps instantly (no
    fade classes in the DOM) but still never blanks mid-load.
- **Done when**: prev/next never shows an empty stage, the incoming frame fades
  in outside reduced motion, and open/close/sound behavior is unchanged.
