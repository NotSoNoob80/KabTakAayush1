/* ============================================================
   KabTakAayush — interaction layer
   All motion is tied to scroll position or hover/focus —
   nothing animates "just because". Transform + opacity only.
   ============================================================ */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Rotating landing headline ----------
     Ten short, dry one-liners cycle through a "shuffle bag" kept in
     localStorage: every line is shown exactly once, in a freshly
     randomised order, before any of them repeats — and the bag is
     reshuffled (without letting the line that just played land first
     again) once it empties. That's what makes each reload feel
     genuinely fresh instead of just rolling dice and risking the same
     line three times in a row. Each entry is pre-split into the same
     two-line shape as the original "Frames Worth / Keeping." so it
     drops straight into the existing reveal markup — the second line
     keeps the `.accent` gold treatment no matter which pair lands. */
  var LANDING_HEADLINES = [
    ['Mostly in', 'focus.'],
    ['Some of it’s', 'good.'],
    ['Mostly on', 'purpose.'],
    ['A few good', 'ones.'],
    ['Few keepers', 'in here.'],
    ['Some made the', 'cut.'],
    ['Eh,', 'these’ll do.'],
    ['Eh, give it', 'a look.'],
    ['Not the', 'worst batch.'],
    ['A few', 'survived editing.']
  ];
  var HEADLINE_QUEUE_KEY = 'kta:landingHeadlineQueue';
  var HEADLINE_LAST_KEY = 'kta:landingHeadlineLast';

  var shuffledIndices = function (length) {
    var indices = [];
    for (var i = 0; i < length; i++) indices.push(i);
    for (var j = indices.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var swap = indices[j];
      indices[j] = indices[k];
      indices[k] = swap;
    }
    return indices;
  };

  var nextHeadlineIndex = function () {
    var queue = [];
    var last = -1;
    try {
      queue = JSON.parse(window.localStorage.getItem(HEADLINE_QUEUE_KEY) || '[]');
      last = parseInt(window.localStorage.getItem(HEADLINE_LAST_KEY), 10);
      if (isNaN(last)) last = -1;
    } catch (e) {
      queue = [];
    }

    if (!queue || !queue.length) {
      queue = shuffledIndices(LANDING_HEADLINES.length);
      // A fresh shuffle could coincidentally put the line that just
      // played back at the front — swap it out so reshuffles never
      // produce a back-to-back repeat at the seam.
      if (queue.length > 1 && queue[0] === last) {
        var tmp = queue[0];
        queue[0] = queue[1];
        queue[1] = tmp;
      }
    }

    var index = queue.shift();

    try {
      window.localStorage.setItem(HEADLINE_QUEUE_KEY, JSON.stringify(queue));
      window.localStorage.setItem(HEADLINE_LAST_KEY, String(index));
    } catch (e) {
      /* Private-browsing/localStorage-disabled: rotation still works,
         it just won't remember its place between reloads. */
    }

    return index;
  };

  var landingTitle = document.getElementById('landing-title');
  if (landingTitle) {
    var headlineLines = landingTitle.querySelectorAll('.line > span');
    if (headlineLines.length >= 2) {
      var chosenHeadline = LANDING_HEADLINES[nextHeadlineIndex()];
      headlineLines[0].textContent = chosenHeadline[0];
      headlineLines[1].textContent = chosenHeadline[1];
    }
  }

  /* ---------- Landing entrance (runs once on load) ---------- */
  var landing = document.getElementById('landing');
  if (landing) {
    requestAnimationFrame(function () {
      landing.classList.add('is-loaded');
    });
  }

  /* ---------- Footer wordmark — per-letter hover "peek" ----------
     Splits the big KABTAKAAYUSH mark into individual <span class="char">
     letters so each one can fill with brand gold and lift slightly on
     hover — like flipping through a contact sheet and one frame catches
     the light. Pure markup transform; CSS (:hover) drives the motion. */
  var wordmarks = document.querySelectorAll('.footer__wordmark');
  wordmarks.forEach(function (mark) {
    var text = mark.textContent;
    mark.textContent = '';
    text.split('').forEach(function (ch) {
      var span = document.createElement('span');
      span.className = 'char';
      span.textContent = ch === ' ' ? ' ' : ch;
      mark.appendChild(span);
    });
  });

  /* ---------- Scroll-triggered reveal ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });

    /* The project index list scrolls inside a fixed-height container —
       items below the fold are clipped and the viewport-rooted observer
       may not fire for them reliably.  A second observer scoped to the
       list container catches every item as it scrolls into view, so
       project counts beyond ~8–10 are never stuck invisible. */
    var indexListEl = document.getElementById('project-index-list');
    if (indexListEl) {
      var listRevealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              listRevealObserver.unobserve(entry.target);
            }
          });
        },
        { root: indexListEl, threshold: 0.01 }
      );
      indexListEl.querySelectorAll('[data-reveal]').forEach(function (el) {
        listRevealObserver.observe(el);
      });
    }
  } else {
    // Fallback: just show everything
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* ---------- Project page: "Back to Projects" button ----------
     A plain `href="projects.html"` always *works*, but it always loads
     the index fresh at the top — so a visitor who scrolled down the
     list, opened a project, then hit "back" lands somewhere that
     doesn't match where they were. That's the "doesn't work right"
     feeling. The fix: when we can tell the visitor actually came from
     the projects page in this tab (same-origin `document.referrer`),
     reuse the browser's own history entry via `history.back()` —
     which restores scroll position from the bfcache — instead of
     pushing a brand-new navigation. Anyone who lands on a project page
     directly (shared link, refresh, new tab — no usable back-entry)
     just falls through to the normal href and gets a fresh index. */
  var projectBackBtn = document.getElementById('project-back-btn');
  if (projectBackBtn) {
    var cameFromIndex = false;
    try {
      var ref = document.referrer ? new URL(document.referrer) : null;
      cameFromIndex = !!ref &&
        ref.origin === window.location.origin &&
        /(^|\/)projects\.html$/.test(ref.pathname) &&
        window.history.length > 1;
    } catch (e) {
      cameFromIndex = false;
    }

    if (cameFromIndex) {
      projectBackBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.history.back();
      });
    }
  }

  /* ---------- Project page — space-void mosaic intro ----------
     Fires only when `intro-armed` is set (i.e. the visitor clicked
     a project title — not on reload or direct load).

     Phase 1: full viewport dark. Every project frame appears small
     in a loose, negative-space grid and drifts gently — zero gravity.
     User clicks anywhere to continue.

     Phase 2: click. Grid blurs (lens rack-focus). Frames converge to
     their real positions (750ms ease-out) while scale overshoots
     slightly on landing (950ms spring curve). Closest-to-centre
     frames arrive first (0–70 ms stagger) — sells the zoom-in read.

     Reveal: nav, back button, eyebrow, title, and description
     stagger in once the mosaic has settled.

     Technical note: Phase-1 uses the individual CSS `translate` and
     `scale` properties; the drift @keyframes uses `transform`. The
     three compose independently — no conflicts.                      */
  var introGrid = document.getElementById('mosaic-grid');
  var introHtml = document.documentElement;

  if (introGrid && introHtml.classList.contains('intro-armed')) {

    var introDone = false;

    if (prefersReducedMotion) {
      /* No intro for users who prefer reduced motion — reveal
         everything immediately and skip all animation.          */
      introDone = true;
      introHtml.classList.remove('intro-armed');

    } else {

      /* Safety fallback: if mosaic:ready never fires (e.g. network
         failure), disarm after 9 s so the page is not stuck blank. */
      var introFallback = window.setTimeout(function () {
        if (introDone) return;
        introDone = true;
        introHtml.classList.remove('intro-armed');
      }, 9000);

      introGrid.addEventListener('mosaic:ready', function onReady() {
        introGrid.removeEventListener('mosaic:ready', onReady);
        if (introDone) return;
        introDone = true;
        window.clearTimeout(introFallback);

        var items = Array.prototype.slice.call(introGrid.querySelectorAll('.mosaic__item'));
        if (!items.length) {
          introHtml.classList.remove('intro-armed');
          return;
        }

        var introCue      = document.getElementById('intro-cue');
        var cuePulseTimer = null;

        var EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
        var vw   = window.innerWidth;
        var vh   = window.innerHeight;
        var n    = items.length;

        /* ── Phase 1 layout ──
           A uniform small grid with generous negative space. Column
           count scales with frame count so every project — whether
           it has 4 photos or 20 — reads as intentionally airy. Each
           cell is ~55 % used; the rest is void.                      */
        var cols     = Math.max(2, Math.round(Math.sqrt(n * (vw / vh))));
        var rows     = Math.ceil(n / cols);
        var padX     = vw * 0.11;
        var padY     = vh * 0.11;
        var cellW    = (vw - padX * 2) / cols;
        var cellH    = (vh - padY * 2) / rows;

        /* Measure every tile's resting position before any transform
           is applied — the grid is in normal flow at this point.     */
        var rects = items.map(function (item) {
          return item.getBoundingClientRect();
        });

        /* Snap each frame instantly to its Phase-1 position, hidden. */
        items.forEach(function (item, i) {
          var rect = rects[i];
          var col  = i % cols;
          var row  = Math.floor(i / cols);

          /* Phase-1 cell centre. */
          var cx1 = padX + col * cellW + cellW * 0.5;
          var cy1 = padY + row * cellH + cellH * 0.5;

          /* Resting grid centre. */
          var cx0 = rect.left + rect.width  * 0.5;
          var cy0 = rect.top  + rect.height * 0.5;

          /* Scale so the frame fills ~55 % of the Phase-1 cell. */
          var s = Math.min(
            (cellW * 0.55) / Math.max(rect.width,  1),
            (cellH * 0.55) / Math.max(rect.height, 1)
          );
          s = Math.max(0.10, Math.min(0.60, s));

          /* Individual CSS properties compose with the drift @keyframes
             (which uses `transform`) without fighting each other.      */
          item.style.transition = 'none';
          item.style.opacity    = '0';
          item.style.translate  = (cx1 - cx0).toFixed(1) + 'px ' + (cy1 - cy0).toFixed(1) + 'px';
          item.style.scale      = s.toFixed(3);

          /* Unique drift path — small amplitude, slow period. */
          var rnd = function (r) { return (Math.random() * r * 2 - r).toFixed(1); };
          item.style.setProperty('--d-x1',       rnd(4)  + 'px');
          item.style.setProperty('--d-y1',       rnd(4)  + 'px');
          item.style.setProperty('--d-r1',       (Math.random() * 1.6 - 0.8).toFixed(2) + 'deg');
          item.style.setProperty('--d-x2',       rnd(4)  + 'px');
          item.style.setProperty('--d-y2',       rnd(4)  + 'px');
          item.style.setProperty('--d-r2',       (Math.random() * 1.6 - 0.8).toFixed(2) + 'deg');
          item.style.setProperty('--drift-dur',  (10 + Math.random() * 8).toFixed(1) + 's');
          item.style.setProperty('--drift-offset', '-' + (Math.random() * 14).toFixed(1) + 's');
        });

        /* Two rAFs let the browser commit the instant-hidden state
           before the staggered fade-in begins.                      */
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {

            var staggerTotal = (n - 1) * 65; /* ms until last frame starts fading */

            /* Stagger each frame into view; drift begins shortly after. */
            items.forEach(function (item, i) {
              window.setTimeout(function () {
                item.style.transition = 'opacity 450ms ' + EASE;
                item.style.opacity    = '1';
                window.setTimeout(function () {
                  item.classList.add('is-drifting');
                }, 350);
              }, i * 65);
            });

            /* Arm click once all frames have faded in (last frame
               starts at staggerTotal, takes 450ms to reach opacity 1;
               extra 100ms buffer so the user always sees a still scene
               before anything happens).                               */
            window.setTimeout(function () {
              /* Show the click cue: fade in, then start a slow breathing
                 pulse. Everything uses inline style.opacity so the pulse
                 can be cleanly interrupted (clearTimeout + opacity 0)
                 without any CSS-animation cascade conflict.              */
              if (introCue) {
                introCue.style.transition = 'opacity 800ms ' + EASE;
                requestAnimationFrame(function () {
                  introCue.style.opacity = '0.55';
                  /* After fade-in settles, start breathing 0.35 ↔ 0.85. */
                  window.setTimeout(function () {
                    var pHigh = false;
                    var pulse = function () {
                      pHigh = !pHigh;
                      introCue.style.transition = 'opacity 1600ms ease-in-out';
                      introCue.style.opacity    = pHigh ? '0.85' : '0.35';
                      cuePulseTimer = window.setTimeout(pulse, 1700);
                    };
                    cuePulseTimer = window.setTimeout(pulse, 50);
                  }, 850);
                });
              }
              document.addEventListener('click', triggerPhase2, { once: true });
            }, staggerTotal + 550);

          });
        });

        /* ── Phase 2: triggered by user click ── */
        var triggerPhase2 = function () {

          /* Dismiss click cue — clear the pulse timer, fade out, then
             lock it gone with .is-dismissed so no later style cleanup
             can ever bring it back. */
          if (introCue) {
            window.clearTimeout(cuePulseTimer);
            cuePulseTimer = null;
            introCue.style.transition = 'opacity 220ms ease-out';
            introCue.style.opacity    = '0';
            window.setTimeout(function () {
              introCue.classList.add('is-dismissed');
            }, 230);
          }

          /* Grid-level blur arc: crisp → 5px → crisp over 950ms.
             Reads as a camera rack-focusing from void to mosaic.       */
          introGrid.classList.add('is-phase2-focusing');

          /* Per-frame stagger: closest to viewport centre first (0 ms),
             furthest last (60 ms) — sells the zoom-in / focus-pull read. */
          var dists = rects.map(function (rect) {
            return Math.hypot(
              rect.left + rect.width  * 0.5 - vw * 0.5,
              rect.top  + rect.height * 0.5 - vh * 0.5
            );
          });
          var maxDist = Math.max.apply(null, dists) || 1;

          requestAnimationFrame(function () {
            /* Step 1 — arm transitions in this rAF so browser commits
               the "from" state before any value changes fire.
               translate: 750ms fast ease-out (position arrives first).
               scale: 950ms spring-overshoot — items slightly overshoot
               their final size before settling, giving the landing
               a sense of weight and momentum.
               transform: 400ms ease-out — the drift @keyframes was
               animating `transform`; removing `is-drifting` would snap
               it from its current offset to none. Adding a transition
               here turns that snap into a smooth settle so there is no
               visible jitter at Phase 2 entry.                         */
            items.forEach(function (item) {
              item.classList.remove('is-drifting');
              item.style.transition =
                'translate 750ms ' + EASE + ', ' +
                'scale 950ms cubic-bezier(0.23, 1.25, 0.32, 1), ' +
                'transform 400ms ' + EASE;
            });
            /* Step 2 — change values in separate timeouts, AFTER the
               rAF has been processed. Browser sees: transition set,
               old value → new value → animate.                         */
            items.forEach(function (item, i) {
              var stagger = Math.round((1 - dists[i] / maxDist) * 60);
              window.setTimeout(function () {
                item.style.translate = '0px 0px';
                item.style.scale     = '1';
              }, stagger + 10);
            });
          });

          /* Chrome reveals after furthest item has landed and settled.
             (70 ms max stagger + 950 ms scale + 180 ms buffer)         */
          window.setTimeout(revealChrome, 1200);
        };

        /* ── Post-Phase-2 chrome reveal ── */
        var revealChrome = function () {
          var fadeIn = function (el, delay, ty) {
            if (!el) return;
            /* Inline-lock to hidden BEFORE removing intro-armed so
               there is no flash as the CSS override lifts.          */
            el.style.transition = 'none';
            el.style.opacity    = '0';
            if (ty) el.style.transform = 'translateY(' + ty + 'px)';

            window.setTimeout(function () {
              el.style.transition = 'opacity 450ms ' + EASE +
                (ty ? ', transform 550ms ' + EASE : '');
              el.style.opacity    = '1';
              if (ty) el.style.transform = 'translateY(0)';
            }, delay + 16);
          };

          var navEl  = document.querySelector('.nav');
          var back   = document.getElementById('project-back-btn');
          var eye    = document.querySelector('.eyebrow');
          var ttl    = document.getElementById('project-title');
          var dsc    = document.getElementById('project-description');

          /* Pre-hide inline before lifting the CSS lock. */
          [navEl, back, eye, ttl, dsc].forEach(function (el) {
            if (el) { el.style.opacity = '0'; el.style.transition = 'none'; }
          });

          introHtml.classList.remove('intro-armed');

          fadeIn(navEl,  0,    0);
          fadeIn(back,   100, 14);
          fadeIn(eye,    220, 14);
          fadeIn(ttl,    370,  0);
          fadeIn(dsc,    530, 14);

          /* Tidy up all inline styles and intro classes once settled. */
          window.setTimeout(function () {
            introGrid.classList.remove('is-phase2-focusing');
            if (introCue) { introCue.style.opacity = ''; introCue.style.transition = ''; }
            [navEl, back, eye, ttl, dsc].forEach(function (el) {
              if (!el) return;
              el.style.opacity    = '';
              el.style.transform  = '';
              el.style.transition = '';
            });
            items.forEach(function (item) {
              item.style.translate  = '';
              item.style.scale      = '';
              item.style.transition = '';
              item.style.opacity    = '';
              ['--d-x1','--d-y1','--d-r1','--d-x2','--d-y2','--d-r2',
               '--drift-dur','--drift-offset'].forEach(function (p) {
                item.style.removeProperty(p);
              });
            });
          }, 1100);
        };

      }); /* end mosaic:ready */

    } /* end !prefersReducedMotion */

  } /* end if introGrid */

  /* ---------- Landing reel — scroll-driven infinite collage ----------
     The home page is a single fixed viewport (body.is-landing locks
     vertical scroll via CSS). Mouse-wheel / trackpad / touch input on
     `.landing` is captured, `preventDefault()`-ed, and converted into
     horizontal motion of `.landing__track` — smoothly chased (lerp)
     toward a target offset every frame, so the motion feels fluid
     rather than jumpy. The track holds the frame sequence twice
     back-to-back; wrapping the offset modulo half its width means the
     loop never visibly resets — the same images simply keep repeating
     for as long as the visitor keeps scrolling, in either direction. */
  var landingTrack = document.getElementById('landing-track');
  var landingReel = document.querySelector('.landing__reel');

  if (landingTrack && landing && !prefersReducedMotion) {
    var halfWidth = 0;
    var target = 0;
    var current = 0;
    var rafId = null;

    /* ---- Live grow-as-it-travels frame scaling ----
       Each frame's visual size is no longer a fixed xs/sm/md/lg/xl
       step — it's read straight off the frame's own position inside
       the visible strip every render: smallest at the left edge,
       largest at the right, smoothly interpolated in between. Because
       every frame keeps moving rightward (then loops back on the
       left), each one continuously grows as it crosses the strip —
       exactly the effect in the reference reel. `baseLeft` is each
       frame's untranslated position (i.e. where it sits when
       current === 0); subtracting the live `current` offset gives its
       true on-screen position without touching layout each frame. */
    var MIN_FRAME_SCALE = 0.72;
    var MAX_FRAME_SCALE = 3.0;
    var frames = [];
    var reelWidth = 0;

    var measureFrames = function () {
      if (!landingReel) return;
      var reelRect = landingReel.getBoundingClientRect();
      reelWidth = reelRect.width;
      var els = landingTrack.querySelectorAll('.landing__frame');
      frames = [];
      els.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        frames.push({
          el: el,
          baseLeft: (rect.left - reelRect.left) + current,
          width: rect.width
        });
      });
    };

    var updateFrameScales = function () {
      if (!frames.length || reelWidth <= 0) return;
      for (var i = 0; i < frames.length; i++) {
        var f = frames[i];
        var center = (f.baseLeft - current) + f.width / 2;
        var ratio = center / reelWidth;
        if (ratio < 0) ratio = 0;
        else if (ratio > 1) ratio = 1;
        // Two-segment ramp pinned at the dead centre: a visitor's eye
        // naturally rests around the middle of the strip, so that's
        // where a frame should sit at its true, undistorted size
        // (scale 1 — its real aspect ratio, neither shrunk nor grown).
        // Below the midpoint we ramp from MIN up to 1; above it, from
        // 1 up to MAX — same gradient feel, but "actual size" now
        // lands exactly where the eye does, instead of at whatever
        // point the MIN→MAX average happened to fall.
        var scale;
        if (ratio <= 0.5) {
          scale = MIN_FRAME_SCALE + (1 - MIN_FRAME_SCALE) * (ratio / 0.5);
        } else {
          scale = 1 + (MAX_FRAME_SCALE - 1) * ((ratio - 0.5) / 0.5);
        }
        f.el.style.setProperty('--frame-scale', scale.toFixed(3));
      }
    };

    var measureReel = function () {
      // `scrollWidth` is rounded to a whole pixel by the browser, so
      // `scrollWidth / 2` can land a fraction of a pixel away from
      // where the duplicate set actually starts — that tiny mismatch
      // is exactly what shows up as a snap/jitter at the loop seam.
      // Instead, measure the duplicate set's real rendered position:
      // translating by precisely that distance is, by definition,
      // the exact amount that places it where the original began.
      var allFrames = landingTrack.querySelectorAll('.landing__frame');
      var half = Math.floor(allFrames.length / 2);
      if (half > 0 && allFrames.length === half * 2) {
        // The track holds the same sequence twice back-to-back, so the
        // duplicate set always starts at frame index `half`. Measuring
        // its real rendered left edge — instead of guessing via
        // scrollWidth / 2, which the browser rounds to a whole pixel —
        // gives the exact distance that places the duplicate where the
        // original began, with zero seam mismatch.
        var trackRect = landingTrack.getBoundingClientRect();
        var dupRect = allFrames[half].getBoundingClientRect();
        halfWidth = dupRect.left - trackRect.left;
      } else {
        halfWidth = landingTrack.scrollWidth / 2;
      }
    };

    var renderReel = function () {
      // `target` only moves in response to wheel/touch input (see the
      // listeners below) — this loop's whole job is to glide `current`
      // smoothly toward wherever `target` currently sits, so a flick
      // of the wheel reads as fluid motion rather than a snap.
      current += (target - current) * 0.12;

      // Once the rendered position completes a full loop, shift BOTH
      // current and target back by exactly one loop-width. Because the
      // track is two identical sets back-to-back, the pixels at
      // position p are identical to the pixels at p - halfWidth — so
      // this shift changes nothing on screen. Crucially it preserves
      // (target - current), so the lerp keeps gliding smoothly with
      // no snap. This is what lets the reel run forever, repeating —
      // in either direction, since input can move it backward too.
      if (halfWidth > 0) {
        while (current >= halfWidth) { current -= halfWidth; target -= halfWidth; }
        while (current < 0) { current += halfWidth; target += halfWidth; }
      }

      // Snap to whole pixels — sub-pixel transforms on filtered images
      // (grayscale/contrast) force the browser to re-rasterize at a
      // fractional offset every frame, which reads as shimmer/jitter.
      // Whole-pixel steps let it move the already-rasterized layer.
      landingTrack.style.transform = 'translate3d(' + Math.round(-current) + 'px, 0, 0)';
      updateFrameScales();

      // Settle-and-stop: once `current` has essentially caught up to
      // `target`, snap them equal and stop the loop — there's nothing
      // left to animate until the next scroll/touch input arrives
      // (which calls `startReel` again). No sense burning a perpetual
      // rAF while a visitor is just reading the headline.
      if (Math.abs(target - current) > 0.05) {
        rafId = window.requestAnimationFrame(renderReel);
      } else {
        current = target;
        rafId = null;
      }
    };

    var startReel = function () {
      if (!rafId) rafId = window.requestAnimationFrame(renderReel);
    };

    /* ---- Bringing the reel up — settle, THEN watch for real changes ----
       Two different timing problems live here, and each needs its own
       fix — solving only one re-breaks the other:

       1) The track is `width: max-content`, so its width GROWS as each
          of the ~70 images finishes loading and claims its real size.
          Measuring (or re-anchoring against) `halfWidth` while that's
          still happening means measuring a moving target — every frame
          the track grows, `current`/`target` get rescaled again, and
          the drift visibly jumps and stutters. The fix is the original
          one: wait until every image has actually finished loading
          before taking the first measurement at all.

       2) But "finished loading" fires differently depending on the
          visit. On a cold visit images stream in slowly enough that
          the browser has long since finished laying out the settled
          track by the time the last one resolves — measuring right
          away is safe. On a reload / back-navigation / hard refresh
          the browser serves them from cache, so every `img.complete`
          check resolves synchronously — frequently a tick BEFORE the
          browser has actually finished laying out the now-stable
          track (fonts swapping, styles settling). Measuring at THAT
          instant bakes in a zero/collapsed width, every frame's
          position ratio collapses to the same number, and the "grow
          as it travels" effect goes flat. The fix is to always wait a
          couple of animation frames after the "ready" signal, so
          layout/paint has caught up regardless of how that signal
          arrived.

       Once both are satisfied we start the perpetual drift, and from
       then on a ResizeObserver — now safe to trust, because the track
       has already reached its settled width — re-anchors on genuine
       layout changes (window resize, font swap) without mistaking
       the loading-time growth for one. */
    var reelSettled = false;

    var syncReel = function () {
      if (!reelSettled) return;
      var prevHalf = halfWidth;
      measureReel();
      if (reelWidth <= 0 || halfWidth <= 0 || prevHalf <= 0) return;
      if (Math.abs(halfWidth - prevHalf) < 0.5) return; // no real change — don't churn the drift

      // Re-anchor so the visual position doesn't jump when the
      // reel's own size genuinely changes underneath it.
      var ratio = halfWidth / prevHalf;
      target *= ratio;
      current *= ratio;
      measureFrames();
      updateFrameScales();
    };

    var settleReel = function () {
      // Two frames is enough for layout/paint to land on the track's
      // true, final, fully-loaded width — whether the "images ready"
      // signal arrived over the network or instantly from cache.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          measureReel();
          measureFrames();
          reelSettled = true;

          /* Entrance sweep — same lerp physics as a scroll gesture.
             Set the track 250 px left of its rest position and apply
             the correct grow-curve scales NOW (while still hidden),
             so the reel is already perfectly positioned when opacity
             fades in. The ongoing lerp then sweeps it rightward over
             ~400 ms: ~180 px in the first 300 ms (fast, scroll-like),
             then a natural ease-out settle. No new animation system —
             the existing lerp does all the work.

             We anchor the rest position at halfWidth/2 (the midpoint
             of the duplicated track) rather than 0. Visually identical
             — the content repeats — but it puts current exactly halfway
             between both wrap boundaries (0 and halfWidth), so the user
             would have to scroll the equivalent of several thousand
             pixels before a wrap fires. This eliminates the one-frame
             GPU-cache-miss flash that happened on the very first scroll
             when current jumped from ~0 to ~halfWidth in a single tick. */
          var midPos = Math.floor(halfWidth / 2);
          current = midPos + 250;
          target  = midPos;
          landingTrack.style.transform = 'translate3d(' + (-(midPos + 250)) + 'px, 0, 0)';
          updateFrameScales();

          // Apply whatever the visitor scrolled while we were still
          // measuring — banked by `nudge` instead of dropped — so the
          // very first impatient scroll registers immediately rather
          // than appearing to do nothing.
          if (pendingDelta !== 0) {
            target += pendingDelta;
            pendingDelta = 0;
          }
          landing.classList.add('is-reel-ready');
          startReel();

          if ('ResizeObserver' in window) {
            var reelResizeObserver = new ResizeObserver(syncReel);
            reelResizeObserver.observe(landingReel);
            reelResizeObserver.observe(landingTrack);
          } else {
            window.addEventListener('resize', syncReel);
          }
        });
      });
    };

    var reelImages = landingTrack.querySelectorAll('img');
    var pendingImages = reelImages.length;

    if (pendingImages === 0) {
      settleReel();
    } else {
      reelImages.forEach(function (img) {
        if (img.complete) {
          pendingImages -= 1;
        } else {
          img.addEventListener('load', function () {
            pendingImages -= 1;
            if (pendingImages <= 0) settleReel();
          });
          img.addEventListener('error', function () {
            pendingImages -= 1;
            if (pendingImages <= 0) settleReel();
          });
        }
      });
      if (pendingImages <= 0) settleReel();
    }

    /* ---- Wheel / touch input → horizontal motion (scroll-jacking) ----
       This is the whole point of locking page scroll on the landing
       viewport: input that would normally move the page vertically is
       captured here, `preventDefault()`-ed so the page never receives
       it, and redirected straight into `target` instead. There's
       nothing to fight over — on this screen, scrolling IS moving
       the reel. `nudge` is the single entry point both gestures funnel
       through, so the lerp/wrap/scale machinery above only has to
       know about `target`, never about *why* it changed. */
    var WHEEL_SENSITIVITY = 1;     // 1px of track motion per 1px of wheel delta
    var TOUCH_SENSITIVITY = 1.35;  // a touch more reach — drags otherwise feel short

    var pendingDelta = 0;

    var nudge = function (delta) {
      // The listeners below go live immediately, but `halfWidth`/`frames`
      // aren't measured until every reel image has finished loading (see
      // `reelSettled`/`settleReel`) — driving the strip before that means
      // moving it with no valid wrap distance to loop against, which is
      // what caused the "blank frames, not infinite anymore" bug. So
      // scrolls that land before settling don't move the strip yet —
      // but they aren't thrown away either: they're banked in
      // `pendingDelta` and applied the instant settling completes (see
      // `settleReel`), so an impatient first scroll still "does
      // something" the moment the reel is ready, instead of feeling
      // like scrolling does nothing at all.
      if (!reelSettled) {
        pendingDelta += delta;
        return;
      }
      target += delta;
      startReel();
    };

    var onWheel = function (e) {
      e.preventDefault();
      // Trackpads commonly report a horizontal swipe (or shift+wheel)
      // via deltaX — honour whichever axis carries the larger intent,
      // so both "scroll down" and "swipe sideways" drive the reel.
      var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      // Both axes report POSITIVE when the gesture moves "forward"
      // (scrolling down / swiping toward the left). The desired
      // mapping is: forward gesture → frames travel left → right —
      // i.e. translateX (which is `-current`) must INCREASE, so
      // `current`/`target` must DECREASE. Hence the negation.
      nudge(-delta * WHEEL_SENSITIVITY);
    };

    var touchActive = false;
    var touchStartX = 0;
    var touchStartY = 0;
    var touchLastX = 0;

    var onTouchStart = function (e) {
      if (!e.touches || !e.touches.length) return;
      touchActive = true;
      touchStartX = touchLastX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    var onTouchMove = function (e) {
      if (!touchActive || !e.touches || !e.touches.length) return;
      var x = e.touches[0].clientX;
      var y = e.touches[0].clientY;
      // Only claim the gesture once it reads as more horizontal than
      // vertical — that's the moment it's unambiguously "for the reel"
      // rather than an attempted (and otherwise-locked) page scroll.
      if (Math.abs(x - touchStartX) > Math.abs(y - touchStartY)) {
        e.preventDefault();
      }
      nudge((touchLastX - x) * TOUCH_SENSITIVITY);
      touchLastX = x;
    };

    var onTouchEnd = function () { touchActive = false; };

    // Captured on `.landing` (the whole fixed viewport), not just the
    // reel strip — a visitor scrolling anywhere on this screen is
    // trying to move through the page, and on this screen "moving
    // through the page" IS moving the reel. Restricting it to the
    // strip would leave scrolling over the headline doing nothing
    // (page scroll is already locked by `body.is-landing`).
    landing.addEventListener('wheel', onWheel, { passive: false });
    landing.addEventListener('touchstart', onTouchStart, { passive: true });
    landing.addEventListener('touchmove', onTouchMove, { passive: false });
    landing.addEventListener('touchend', onTouchEnd, { passive: true });
    landing.addEventListener('touchcancel', onTouchEnd, { passive: true });
  } else if (landingTrack && prefersReducedMotion) {
    // Respect reduced-motion: let the track scroll natively (overflow-x: auto via CSS),
    // and let the page itself scroll normally too (body.is-landing relaxes via CSS).
    landingTrack.style.transform = 'none';
  }

  /* ---------- Project filter (Projects page only) ---------- */
  var filterButtons = document.querySelectorAll('.filters button[data-filter]');
  var projectCards = document.querySelectorAll('#project-index-list .index__item');

  if (filterButtons.length && projectCards.length) {
    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.getAttribute('data-filter');

        filterButtons.forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });

        projectCards.forEach(function (card) {
          var match = filter === 'all' || card.getAttribute('data-type') === filter;
          card.style.transition = 'opacity 220ms ease-out, transform 220ms ease-out';
          if (match) {
            card.style.display = '';
            requestAnimationFrame(function () {
              card.style.opacity = '1';
              card.style.transform = 'scale(1)';
            });
          } else {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.97)';
            setTimeout(function () {
              if (card.style.opacity === '0') card.style.display = 'none';
            }, 220);
          }
        });
      });
    });
  }

  /* ---------- Project index — title list ↔ thumbnail preview ----------
     Hovering or focusing a title swaps the preview to that project's
     thumbnail. Three refinements over a plain opacity crossfade:

     1. Direction-aware swap — the preview frame translates in the same
        direction as the user moved in the list (down the list = frame
        exits upward, incoming arrives from below; up = reversed), so
        the swap feels spatially connected to the list rather than being
        a random dissolve.

     2. Meta text crossfades in step with the image swap, so the
        location copy and the photo always change as one unit.

     3. Timeout synced to the CSS `transition: opacity 200ms` on the
        image — the previous version fired at 160ms, before the fade
        had completed, so the src changed while the image was still
        ~20% visible and the opacity snapped back up from there. */
  var indexList = document.getElementById('project-index-list');
  var indexPreviewImg = document.getElementById('project-index-preview-img');
  var indexPreviewMeta = document.getElementById('project-index-preview-meta');

  if (indexList && indexPreviewImg) {
    var indexItems = indexList.querySelectorAll('.index__item');
    var indexFrame = document.querySelector('.index__preview-frame');
    var prevActiveIdx = 0;
    /* Inline-safe easing — literal value of --ease-out (CSS custom
       properties aren't resolved in element.style.transition strings). */
    var EASE_OUT_VAL = 'cubic-bezier(0.23, 1, 0.32, 1)';

    var setActiveIndexItem = function (item) {
      if (!item) return;
      var newIdx = Array.prototype.indexOf.call(indexItems, item);
      /* Direction: 1 = moved downward in the list, -1 = upward.
         Hovering the same item twice keeps the previous direction. */
      var direction = newIdx > prevActiveIdx ? 1 : -1;
      prevActiveIdx = newIdx;

      indexItems.forEach(function (it) {
        it.classList.toggle('is-active', it === item);
      });

      var thumb = item.getAttribute('data-thumb');
      var meta = item.getAttribute('data-meta') || '';

      if (thumb && indexPreviewImg.getAttribute('src') !== thumb) {
        /* Phase 1 — fade image out, slide frame in exit direction */
        indexPreviewImg.style.opacity = '0';
        if (indexFrame && !prefersReducedMotion) {
          indexFrame.style.transition = 'transform 200ms ' + EASE_OUT_VAL;
          /* -direction: moving down the list → frame exits upward (-Y) */
          indexFrame.style.transform = 'translateY(' + (direction * -10) + 'px)';
        }

        /* Wait for the 200ms CSS opacity fade to fully complete (+20ms
           buffer) before swapping src and beginning the entrance. */
        setTimeout(function () {
          indexPreviewImg.src = thumb;
          indexPreviewImg.alt = item.querySelector('.index__title')
            ? item.querySelector('.index__title').textContent
            : '';

          /* Phase 2 — snap to arriving-from direction, then ease to rest.
             Two rAFs guarantee the browser has committed the transform:none
             before we add the transition that animates it back. */
          if (indexFrame && !prefersReducedMotion) {
            indexFrame.style.transition = 'none';
            indexFrame.style.transform = 'translateY(' + (direction * 10) + 'px)';
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                indexFrame.style.transition = 'transform 320ms ' + EASE_OUT_VAL;
                indexFrame.style.transform = 'translateY(0)';
              });
            });
          }
          indexPreviewImg.style.opacity = '1';
        }, 220);
      }

      /* Fade meta text out/in in step with the image swap */
      if (indexPreviewMeta && indexPreviewMeta.textContent !== meta) {
        indexPreviewMeta.style.opacity = '0';
        setTimeout(function () {
          indexPreviewMeta.textContent = meta;
          indexPreviewMeta.style.opacity = '1';
        }, 160);
      }
    };

    indexItems.forEach(function (item) {
      item.addEventListener('mouseenter', function () { setActiveIndexItem(item); });
      item.addEventListener('focus', function () { setActiveIndexItem(item); });
    });

    indexList.addEventListener('mouseleave', function () {
      var current = indexList.querySelector('.index__item.is-active');
      if (!current && indexItems.length) setActiveIndexItem(indexItems[0]);
    });

    /* Flag deliberate project navigation so the space-void intro
       only fires on click-through — not on reload or direct load. */
    indexList.addEventListener('click', function (e) {
      if (e.target.closest('a[href*="project.html"]')) {
        sessionStorage.setItem('kta:from-projects', '1');
      }
    });
  }

  /* ---------- Reel preview — small, click-anchored "loose print" ----------
     Click any frame: a small paper print of that photo — shown at its
     true, uncropped aspect ratio, not the cover-cropped thumbnail —
     lands right where the cursor was, tilted like something just set
     down by hand, and blooms open through a circular clip-path
     centred on the exact clicked pixel (--reveal-x/--reveal-y). The
     reel doubles as the close target: with the print open, the very
     next click anywhere on the reel — or on the print itself — folds
     that same iris shut around wherever THAT click lands, and the
     print disappears. No modal backdrop, no close button; the click
     that dismisses it is also what drives the animation. */
  var previewEl = document.getElementById('landing-preview');
  var previewImg = previewEl ? previewEl.querySelector('.landing__preview-img') : null;

  if (previewEl && previewImg && landingReel) {
    var previewOpen = false;
    var CARD_PAD_X = 14;     // keep in sync with .landing__preview padding
    var CARD_PAD_TOP = 14;
    var CARD_PAD_BOTTOM = 40;
    var MAX_W = 280;
    var MAX_H = 360;
    var EDGE_MARGIN = 18;    // never let the print touch the viewport edge

    var openPreview = function (frameImg, x, y) {
      var naturalW = frameImg.naturalWidth || frameImg.width || 1;
      var naturalH = frameImg.naturalHeight || frameImg.height || 1;
      var ratio = naturalW / naturalH;

      // Size the print from the photo's OWN proportions — never the
      // cropped thumbnail's — clamped so it stays "small," per spec.
      var w = MAX_W;
      var h = w / ratio;
      if (h > MAX_H) { h = MAX_H; w = h * ratio; }
      previewImg.style.width = Math.round(w) + 'px';
      previewImg.style.height = Math.round(h) + 'px';
      previewImg.src = frameImg.currentSrc || frameImg.src;
      previewImg.alt = frameImg.alt || '';

      var cardW = w + CARD_PAD_X * 2;
      var cardH = h + CARD_PAD_TOP + CARD_PAD_BOTTOM;

      // Land the print centred on the click, then nudge it back inside
      // the viewport if that would hang it off an edge.
      var left = x - cardW / 2;
      var top = y - cardH / 2;
      var maxLeft = window.innerWidth - EDGE_MARGIN - cardW;
      var maxTop = window.innerHeight - EDGE_MARGIN - cardH;
      if (left < EDGE_MARGIN) left = EDGE_MARGIN;
      if (top < EDGE_MARGIN) top = EDGE_MARGIN;
      if (left > maxLeft) left = Math.max(EDGE_MARGIN, maxLeft);
      if (top > maxTop) top = Math.max(EDGE_MARGIN, maxTop);

      previewEl.style.left = Math.round(left) + 'px';
      previewEl.style.top = Math.round(top) + 'px';

      // However the card lands, the bloom must start from the exact
      // pixel the visitor clicked — so re-express that click point in
      // the card's own local coordinates.
      previewEl.style.setProperty('--reveal-x', Math.round(x - left) + 'px');
      previewEl.style.setProperty('--reveal-y', Math.round(y - top) + 'px');

      // A faint random tilt on every open — never quite the same twice,
      // like pulling a fresh print off a stack and setting it down.
      previewEl.style.setProperty('--tilt', ((Math.random() * 6) - 3).toFixed(2) + 'deg');

      previewEl.classList.add('is-active');
      previewEl.setAttribute('aria-hidden', 'false');
      previewOpen = true;
    };

    var closePreview = function (x, y) {
      // Re-anchor the clip-path to wherever the CLOSING click landed
      // (which may be off the card entirely — e.g. elsewhere on the
      // reel) — clip-path circles are happy to collapse toward a
      // centre outside their own box, and that's exactly the quirk
      // that makes the close feel like it follows the visitor, not
      // just rewinds the open.
      if (typeof x === 'number') {
        var rect = previewEl.getBoundingClientRect();
        previewEl.style.setProperty('--reveal-x', Math.round(x - rect.left) + 'px');
        previewEl.style.setProperty('--reveal-y', Math.round(y - rect.top) + 'px');
      }
      previewEl.classList.remove('is-active');
      previewEl.setAttribute('aria-hidden', 'true');
      previewOpen = false;
    };

    previewEl.addEventListener('click', function (e) {
      e.stopPropagation();
      closePreview(e.clientX, e.clientY);
    });

    landingReel.addEventListener('click', function (e) {
      if (previewOpen) {
        closePreview(e.clientX, e.clientY);
        return;
      }
      var frame = e.target.closest('.landing__frame');
      if (!frame) return;
      var img = frame.querySelector('img');
      if (!img) return;
      openPreview(img, e.clientX, e.clientY);
    });

    window.addEventListener('keydown', function (e) {
      if (previewOpen && e.key === 'Escape') closePreview();
    });
  }

  /* ---------- Easter eggs — small, rotating asides ----------
     A handful of quiet nudges that only surface when a visitor
     does something a little "too much": hovers the wordmark
     repeatedly, lingers on one reel frame, keeps reloading,
     can't pick a project, sits idle a while, or finds the one
     hidden key sequence. Every trigger funnels into the SAME
     small toast (see `.easter-toast` in styles.css) through
     `showEgg`, which enforces one shared cooldown — so however
     many things are wired up, they read as occasional, quiet
     asides, never a pile-up of notifications. Quoted, gold, and
     riding just beside the cursor — `pointer-events: none` keeps
     it from ever blocking a click — it never interrupts anything,
     it's just there if you happen to look. (Pure text appearances
     — left untouched by the reduced-motion guard above;
     `.easter-toast` already collapses its own fade to a simple
     opacity-only swap for that case.) */
  {
    var TOAST_MIN_GAP_MS = 26000;
    var TOAST_VISIBLE_MS = 4000;
    var lastEggAt = 0;
    var eggToast = null;
    var eggHideTimer = null;

    var ensureEggToast = function () {
      if (eggToast) return eggToast;
      eggToast = document.createElement('p');
      eggToast.className = 'easter-toast';
      eggToast.setAttribute('role', 'status');
      eggToast.setAttribute('aria-live', 'polite');
      document.body.appendChild(eggToast);
      return eggToast;
    };

    // ---- Cursor-following placement ----
    // The toast rides just beside the pointer rather than sitting
    // in a fixed corner — close to wherever attention already is,
    // never in the way. `mousemove` only ever updates two numbers
    // (cheap); the toast itself is repositioned solely while it's
    // actually visible. Touch devices have no persistent cursor,
    // so they get a quiet, fixed resting spot instead.
    var TOAST_OFFSET_X = 22;
    var TOAST_OFFSET_Y = 28;
    var TOAST_EDGE_MARGIN = 16;
    var hasFinePointer = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
    var lastPointerX = window.innerWidth / 2;
    var lastPointerY = window.innerHeight / 2;

    var positionEggToast = function () {
      if (!eggToast) return;
      var rect = eggToast.getBoundingClientRect();
      var w = rect.width || 220;
      var h = rect.height || 56;
      var x, y;

      if (hasFinePointer) {
        x = lastPointerX + TOAST_OFFSET_X;
        y = lastPointerY + TOAST_OFFSET_Y;
        // Flip to whichever side of the cursor still fits on screen.
        if (x + w > window.innerWidth - TOAST_EDGE_MARGIN) x = lastPointerX - TOAST_OFFSET_X - w;
        if (y + h > window.innerHeight - TOAST_EDGE_MARGIN) y = lastPointerY - TOAST_OFFSET_Y - h;
        if (x < TOAST_EDGE_MARGIN) x = TOAST_EDGE_MARGIN;
        if (y < TOAST_EDGE_MARGIN) y = TOAST_EDGE_MARGIN;
      } else {
        // No cursor to follow — settle quietly in a corner instead.
        x = window.innerWidth - w - TOAST_EDGE_MARGIN - 4;
        y = window.innerHeight - h - TOAST_EDGE_MARGIN - 4;
      }

      eggToast.style.left = Math.round(x) + 'px';
      eggToast.style.top = Math.round(y) + 'px';
    };

    if (hasFinePointer) {
      window.addEventListener('mousemove', function (e) {
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        if (eggToast && eggToast.classList.contains('is-visible')) positionEggToast();
      }, { passive: true });
    }

    // `force` lets the one genuinely rare trigger (the hidden key
    // sequence) always speak up, even if something else just did —
    // finding it should never quietly fail to register.
    var showEgg = function (message, force) {
      if (!message) return false;
      var now = Date.now();
      if (!force && now - lastEggAt < TOAST_MIN_GAP_MS) return false;
      lastEggAt = now;

      var el = ensureEggToast();
      window.clearTimeout(eggHideTimer);
      el.textContent = message;
      positionEggToast();
      requestAnimationFrame(function () {
        positionEggToast(); // re-measure now that the new text has set its size
        el.classList.add('is-visible');
      });
      eggHideTimer = window.setTimeout(function () {
        el.classList.remove('is-visible');
      }, TOAST_VISIBLE_MS);
      return true;
    };

    // Tiny "don't repeat the line you just said" picker — the
    // pools below are short and don't need to survive reloads
    // (unlike the headline shuffle-bag), so a lightweight repeat
    // guard is enough to keep them feeling varied.
    var lastEggIndex = {};
    var pickEggLine = function (poolKey, pool) {
      if (!pool || !pool.length) return null;
      var idx = Math.floor(Math.random() * pool.length);
      if (pool.length > 1 && idx === lastEggIndex[poolKey]) {
        idx = (idx + 1) % pool.length;
      }
      lastEggIndex[poolKey] = idx;
      return pool[idx];
    };

    /* ---- 1. Footer wordmark — "you keep coming back to this" ----
       Every third hover (3rd, 6th, 9th…) on the KABTAKAAYUSH mark
       offers a quiet aside — frequent enough to reward the people
       who keep playing with it, spaced enough to never feel like
       the mark is heckling them. */
    var FOOTER_EGG_LINES = [
      'The most non-boring footer.',
      'You should check my projects too — they’re fun as well.',
      'Okay, but have you clicked anything yet?',
      'This is the part where you scroll back up.',
      'Plot twist: there’s nothing hidden in the letters. Or is there?'
    ];
    document.querySelectorAll('.footer__wordmark').forEach(function (mark) {
      var hoverCount = 0;
      var nextAt = 3;
      mark.addEventListener('mouseenter', function () {
        hoverCount += 1;
        if (hoverCount >= nextAt) {
          nextAt = hoverCount + 3;
          showEgg(pickEggLine('footer', FOOTER_EGG_LINES));
        }
      });
    });

    /* ---- 2. Landing reel — "you've been staring at one frame" ----
       If the cursor sits over the same frame for a few seconds
       without moving on, that's someone actually looking — not
       just passing through. Worth a small acknowledgment. */
    var REEL_EGG_LINES = [
      'This one’s a personal favourite, actually.',
      'Zooming in won’t help — trust me, I tried.',
      'Good eye. That one took some waiting around for.',
      'You’ve been staring. The story behind it lives over in Projects.'
    ];
    if (landingReel) {
      var reelDwellTimer = null;
      var reelDwellFrame = null;

      landingReel.addEventListener('mouseover', function (e) {
        var frame = e.target && e.target.closest ? e.target.closest('.landing__frame') : null;
        if (!frame || frame === reelDwellFrame) return;
        reelDwellFrame = frame;
        window.clearTimeout(reelDwellTimer);
        reelDwellTimer = window.setTimeout(function () {
          showEgg(pickEggLine('reel', REEL_EGG_LINES));
        }, 4200);
      });

      landingReel.addEventListener('mouseleave', function () {
        reelDwellFrame = null;
        window.clearTimeout(reelDwellTimer);
      });
    }

    /* ---- 3. Repeated reloads — "you keep coming back" ----
       A quiet counter in localStorage (so it persists across
       sessions, like the headline shuffle-bag does) — every fifth
       visit to the home page earns a one-off line, tracked so it
       never repeats for the same milestone on a refresh-spam. */
    var RELOAD_EGG_LINES = [
      'You’ve refreshed this more than I’ve finished a project on time.',
      'Back again? I’m flattered.',
      'At this point you might as well bookmark it.'
    ];
    if (landing) {
      try {
        var visitCount = (parseInt(window.localStorage.getItem('kta:visitCount'), 10) || 0) + 1;
        window.localStorage.setItem('kta:visitCount', String(visitCount));

        var lastMilestone = parseInt(window.localStorage.getItem('kta:visitMilestone'), 10) || 0;
        var milestone = Math.floor(visitCount / 5) * 5;

        if (milestone >= 5 && milestone > lastMilestone) {
          window.localStorage.setItem('kta:visitMilestone', String(milestone));
          var reloadLine = pickEggLine('reload', RELOAD_EGG_LINES);
          // Let the landing entrance settle before speaking up.
          window.setTimeout(function () { showEgg(reloadLine); }, 2200);
        }
      } catch (e) {
        /* localStorage unavailable — skip quietly, nothing to track */
      }
    }

    /* ---- 4. Project index — "still browsing, not picking" ----
       Ten seconds after landing on the index, if nothing has
       been clicked through to yet, that reads as "looking, not
       choosing" — worth one quiet nudge. Clicking any title
       cancels the clock outright (they found their pick); it
       only ever gets the one chance to speak up per visit. */
    var INDEX_EGG_LINES = [
      'Pick one. I believe in you.',
      'They’re all good — I’m biased, but still.',
      'This is basically a slideshow now.',
      'Ten seconds in — still deciding?'
    ];
    if (indexList && indexItems && indexItems.length > 2) {
      var indexPicked = false;
      indexItems.forEach(function (item) {
        item.addEventListener('click', function () { indexPicked = true; });
      });
      window.setTimeout(function () {
        if (!indexPicked) showEgg(pickEggLine('index', INDEX_EGG_LINES));
      }, 10000);
    }

    /* ---- 5. Idle — "you've been sitting here a while" ----
       Any real input (scroll, move, click, key, touch) resets the
       clock; ~50 seconds of nothing earns one gentle line, and the
       clock re-arms itself so a visitor who steps away twice gets
       acknowledged twice — never more than the shared cooldown
       allows, though, so it can't stack with anything else. */
    var IDLE_EGG_LINES = [
      'Still here? I’m flattered.',
      'No rush — the frames aren’t going anywhere.',
      'Take your time. That’s sort of the point of this place.'
    ];
    var idleTimer = null;
    var idleArmed = true;
    var rearmIdle = function () {
      idleArmed = true;
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(function () {
        if (!idleArmed) return;
        idleArmed = false;
        showEgg(pickEggLine('idle', IDLE_EGG_LINES));
      }, 50000);
    };
    ['scroll', 'mousemove', 'keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(function (evt) {
      window.addEventListener(evt, rearmIdle, { passive: true });
    });
    rearmIdle();

    /* ---- 6. Hidden trigger — type the code ----
       A T 8 0. No hint anywhere that it exists; the only people
       who'll ever see this line are the ones who went looking
       for a secret on a photography portfolio. Fires once per
       visit and bypasses the shared cooldown — a find this rare
       should never silently get swallowed by another egg's timer. */
    var SECRET_SEQUENCE = ['a', 't', '8', '0'];
    var secretProgress = 0;
    var secretFound = false;
    window.addEventListener('keydown', function (e) {
      if (secretFound) return;
      var key = (e.key || '').toLowerCase();
      if (key === SECRET_SEQUENCE[secretProgress]) {
        secretProgress += 1;
        if (secretProgress === SECRET_SEQUENCE.length) {
          secretFound = true;
          showEgg('You found the thing. There’s no prize — just this sentence.', true);
        }
      } else {
        secretProgress = (key === SECRET_SEQUENCE[0]) ? 1 : 0;
      }
    });
  }

  /* ---------- Active nav underline on click feedback ---------- */
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('pointerdown', function () {
      btn.style.transform = 'scale(0.97)';
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (evt) {
      btn.addEventListener(evt, function () {
        btn.style.transform = '';
      });
    });
  });
})();
