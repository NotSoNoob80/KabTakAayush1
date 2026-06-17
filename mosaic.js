/* ============================================================
   PROJECT MOSAIC
   ------------------------------------------------------------
   Builds the editorial collage grid for project.html?id=NN.
   Resolves the project from projects-data.js, sets the page
   heading + location (no longer the long-form description —
   per spec the copy stays minimal: heading and location only),
   then lays each image into a CSS grid. Every tile's span is
   derived from its own image's natural aspect ratio so wide,
   tall, and square frames weave together into a mixed-size
   mosaic — no physics, no drag, just a calm responsive grid
   with the brand's grayscale-to-colour hover reveal.
   ============================================================ */

(function () {
  'use strict';

  var grid = document.getElementById('mosaic-grid');
  if (!grid || typeof PROJECTS === 'undefined') return;

  var params = new URLSearchParams(window.location.search);
  var requestedId = (params.get('id') || '01').padStart(2, '0');
  var project = (typeof getProjectById === 'function' && getProjectById(requestedId)) || PROJECTS[0];

  var titleEl = document.getElementById('project-title');
  var subEl = document.getElementById('project-description');
  var eyebrowEl = document.getElementById('project-eyebrow');
  var docTitleEl = document.getElementById('project-doc-title');

  if (titleEl) titleEl.textContent = project.title;
  if (subEl) subEl.textContent = project.meta || '';
  if (eyebrowEl) eyebrowEl.textContent = 'Project ' + project.id + ' — ' + projectTypeLabel(project);
  if (docTitleEl) docTitleEl.textContent = project.title + ' — KabTakAayush';

  /* The Manifest's description isn't shown in the page's visible copy
     (that stays "heading + location only", by design) — it feeds the
     page's meta description for search engines instead. */
  var metaDescEl = document.querySelector('meta[name="description"]');
  if (metaDescEl && project.description) metaDescEl.setAttribute('content', project.description);

  /* Ordered image+video media list (videos woven evenly among the
     photos, see projectMedia in projects-data.js). Falls back to the
     image-only list if projectMedia isn't available, so an older
     projects-data.js still renders its photos. */
  var media = (typeof projectMedia === 'function')
    ? projectMedia(project)
    : ((typeof projectImages === 'function')
        ? projectImages(project).map(function (src) { return { kind: 'image', src: src }; })
        : []);

  /* Tells script.js's scattered-entrance sequence (see "Project page —
     scattered-to-structured mosaic intro" in script.js) once every tile
     has settled — loaded *and* sized, so `is-wide`/`is-tall` spans are
     final and the grid won't reflow mid-animation. Fired even when the
     project has no frames, so the intro script doesn't sit waiting. */
  var announceReady = function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        grid.dispatchEvent(new CustomEvent('mosaic:ready', { bubbles: true }));
      });
    });
  };

  /* Film-only projects (no images, only videos) get a single-column
     full-width stack layout instead of the 3-column mosaic grid.
     The class triggers a CSS override that removes the multi-column
     template and lets each video tile fill the full row. */
  var isFilmOnly = (project.imageCount === 0 && (project.videoCount || 0) > 0);
  if (isFilmOnly) grid.classList.add('mosaic__grid--film');

  if (!media.length) {
    var empty = document.createElement('p');
    empty.className = 'mosaic__empty';
    empty.textContent = 'Frames for this project are on their way — check back soon.';
    grid.appendChild(empty);
    announceReady();
    return;
  }

  var pendingTiles = media.length;
  var tileSettled = function () {
    pendingTiles -= 1;
    if (pendingTiles <= 0) announceReady();
  };

  /* ============================================================
     Mosaic preview — click-to-open full-screen view
     ------------------------------------------------------------
     Opens the clicked tile (image or video) on a dark backdrop.
     The overlay markup is built lazily on first open; closing it
     restores focus to the tile that opened it. Inline tile videos
     are paused while the preview is open so two copies don't play
     in parallel, and resumed on close.
     ============================================================ */
  var MosaicPreview = (function () {
    var overlay = null;
    var closeBtn = null;
    var prevBtn = null;
    var nextBtn = null;
    var stage = null;
    var hint = null;
    var lastTrigger = null;
    var pausedTiles = [];
    var currentIndex = -1;
    var hintTimer = 0;
    var touchStartX = 0, touchStartY = 0, touchActive = false;
    var reducedMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* No fine pointer → treat as touch: nav buttons give way to swipe, and
       the after-10s cue points at the gesture rather than the arrow keys. */
    var isTouch = !(window.matchMedia &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches);

    var build = function () {
      overlay = document.createElement('div');
      overlay.className = 'mosaic-preview';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Preview');
      overlay.setAttribute('hidden', '');
      overlay.innerHTML =
        '<div class="mosaic-preview__backdrop" data-close></div>' +
        '<button class="mosaic-preview__close" type="button" aria-label="Close preview">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M6 6 L18 18"/>' +
            '<path d="M18 6 L6 18"/>' +
          '</svg>' +
        '</button>' +
        '<button class="mosaic-preview__nav mosaic-preview__nav--prev" type="button" aria-label="Previous">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19"/></svg>' +
        '</button>' +
        '<button class="mosaic-preview__nav mosaic-preview__nav--next" type="button" aria-label="Next">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 L16 12 L9 19"/></svg>' +
        '</button>' +
        '<div class="mosaic-preview__stage"></div>' +
        '<div class="mosaic-preview__hint" aria-hidden="true"></div>';
      document.body.appendChild(overlay);
      closeBtn = overlay.querySelector('.mosaic-preview__close');
      prevBtn  = overlay.querySelector('.mosaic-preview__nav--prev');
      nextBtn  = overlay.querySelector('.mosaic-preview__nav--next');
      stage    = overlay.querySelector('.mosaic-preview__stage');
      hint     = overlay.querySelector('.mosaic-preview__hint');
      hint.textContent = isTouch ? 'Swipe to browse' : 'Use ← → to browse';

      overlay.addEventListener('click', function (e) {
        if (e.target && e.target.hasAttribute('data-close')) close();
      });
      closeBtn.addEventListener('click', close);
      prevBtn.addEventListener('click', function () { go(-1); });
      nextBtn.addEventListener('click', function () { go(1); });
      document.addEventListener('keydown', function (e) {
        if (!overlay || overlay.hasAttribute('hidden')) return;
        if (e.key === 'Escape' || e.key === 'Esc') {
          close();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault(); go(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault(); go(1);
        }
      });

      /* Swipe — a horizontal drag across the overlay flips frames on touch
         devices. The vertical guard keeps a scroll-ish drag from triggering
         navigation, and the distance threshold ignores incidental taps. */
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
    };

    /* Render media[index] onto the stage, replacing whatever's there. */
    var render = function (index) {
      currentIndex = index;
      var item = media[index];
      stage.innerHTML = '';

      var node;
      if (item.kind === 'video') {
        node = document.createElement('video');
        node.src = item.src;
        node.controls = true;
        node.autoplay = true;
        node.loop = true;
        /* Start muted to satisfy autoplay policies; native controls
           let the visitor unmute. */
        node.muted = true;
        node.setAttribute('playsinline', '');
        node.setAttribute('preload', 'metadata');
      } else {
        node = document.createElement('img');
        node.src = item.src;
        node.alt = '';
        node.decoding = 'async';
      }
      stage.appendChild(node);
    };

    /* Step the preview by ±1 with wraparound. Any deliberate navigation
       means the visitor already knows how to move — retire the cue. */
    var go = function (delta) {
      if (media.length <= 1) return;
      cancelHint();
      var n = media.length;
      render(((currentIndex + delta) % n + n) % n);
    };

    /* The after-10s cue: if the visitor hasn't navigated within 10s of
       opening, surface the hint (swipe on touch, arrows on desktop) for a
       few seconds, then let it fade. Cancelled the moment they navigate or
       close. Single-item previews never schedule it — there's nowhere to go. */
    var cancelHint = function () {
      if (hintTimer) { window.clearTimeout(hintTimer); hintTimer = 0; }
      if (overlay) overlay.classList.remove('is-hinting');
    };
    var scheduleHint = function () {
      cancelHint();
      if (media.length <= 1) return;
      hintTimer = window.setTimeout(function () {
        overlay.classList.add('is-hinting');
        hintTimer = window.setTimeout(function () {
          overlay.classList.remove('is-hinting');
          hintTimer = 0;
        }, 4000);
      }, 10000);
    };

    var open = function (index, trigger) {
      if (!overlay) build();
      lastTrigger = trigger || null;
      /* Only expose the arrows (desktop) / cue when there's more than one
         frame to move between. */
      overlay.classList.toggle('has-nav', media.length > 1);
      render(index);

      /* Pause every inline tile video so two copies don't play. */
      pausedTiles = [];
      for (var i = 0; i < videoTiles.length; i++) {
        var v = videoTiles[i];
        if (!v.paused) {
          pausedTiles.push(v);
          try { v.pause(); } catch (err) { /* ignore */ }
        }
      }

      overlay.removeAttribute('hidden');
      document.body.classList.add('has-preview');
      /* Force a paint of the hidden→shown state before flipping
         is-open, so the opacity/scale transition actually plays. */
      void overlay.offsetWidth;
      overlay.classList.add('is-open');
      /* Move focus to the close button so ESC/Enter work immediately
         and screen readers announce the dialog. */
      try { closeBtn.focus(); } catch (err) { /* ignore */ }

      scheduleHint();
    };

    var close = function () {
      if (!overlay || overlay.hasAttribute('hidden')) return;
      cancelHint();
      overlay.classList.remove('is-open');

      var finalize = function () {
        overlay.setAttribute('hidden', '');
        stage.innerHTML = '';
        document.body.classList.remove('has-preview');
        /* Resume the inline tile videos we paused on open. play() can
           reject; swallow it the same way the IO observer does. */
        for (var i = 0; i < pausedTiles.length; i++) {
          var p = pausedTiles[i].play();
          if (p && typeof p.catch === 'function') p.catch(function () {});
        }
        pausedTiles = [];
        if (lastTrigger && typeof lastTrigger.focus === 'function') {
          try { lastTrigger.focus(); } catch (err) { /* ignore */ }
        }
        lastTrigger = null;
      };

      if (reducedMotion) finalize();
      else window.setTimeout(finalize, 240);
    };

    return { open: open };
  })();

  /* Apply the same wide/tall span classification from a tile's natural
     dimensions — shared by image (naturalWidth/Height) and video
     (videoWidth/Height) tiles so both weave into the mosaic identically. */
  var classify = function (fig, w, h) {
    if (w && h) {
      var ratio = w / h;
      if (ratio >= 1.4) {
        fig.classList.add('is-wide');
      } else if (ratio <= 0.7) {
        fig.classList.add('is-tall');
      }
    }
  };

  /* Every video element on this grid — used to enforce "only one
     unmuted at a time": unmuting one mutes all the others. */
  var videoTiles = [];

  /* One shared observer: a video plays while ≥25% of it is on screen
     and pauses otherwise, so off-screen frames cost nothing. play()
     can reject under autoplay policies — swallow that, never throw. */
  var io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var vid = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
            var playing = vid.play();
            if (playing && typeof playing.catch === 'function') {
              playing.catch(function () {});
            }
          } else {
            vid.pause();
          }
        });
      }, { threshold: [0, 0.25] })
    : null;

  var buildImageTile = function (src, index) {
    var fig = document.createElement('figure');
    fig.className = 'mosaic__item';
    fig.setAttribute('role', 'button');
    fig.setAttribute('tabindex', '0');
    fig.setAttribute('aria-label', 'Open preview');
    fig.addEventListener('click', function () {
      MosaicPreview.open(index, fig);
    });
    fig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        MosaicPreview.open(index, fig);
      }
    });

    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    /* Eager, not lazy: the scattered-entrance sequence needs every
       tile's true aspect ratio (and therefore its final grid span)
       known up front, so positions don't shift mid-assembly. These
       are the very photos a visitor came to this page to see. */
    img.loading = 'eager';
    img.decoding = 'async';

    /* Per the living Mosaic: tiles are NOT settled (no `.is-loaded`) on
       image-load anymore. The scroll-into-view observer in script.js
       owns first-crossing settle so off-screen tiles don't finish their
       entrance before the visitor reaches them. We still classify
       (so the grid span is final before mosaic:ready) and tick the
       handshake so the intro can start. */
    var sized = function () {
      classify(fig, img.naturalWidth, img.naturalHeight);
      tileSettled();
    };

    if (img.complete && img.naturalWidth) {
      sized();
    } else {
      img.addEventListener('load', sized, { once: true });
      img.addEventListener('error', function () {
        tileSettled();
      }, { once: true });
    }

    /* The .mosaic__settle wrapper owns Tile settle (scale). The frame
       (figure) carries no transform so the grid can never seam; the
       img will own Frame drift (translate). See the living Mosaic plan. */
    var settle = document.createElement('div');
    settle.className = 'mosaic__settle';
    settle.appendChild(img);
    fig.appendChild(settle);
    grid.appendChild(fig);
  };

  var buildVideoTile = function (src, index) {
    var fig = document.createElement('figure');
    fig.className = 'mosaic__item mosaic__item--video';
    fig.setAttribute('role', 'button');
    fig.setAttribute('tabindex', '0');
    fig.setAttribute('aria-label', 'Open preview');

    var video = document.createElement('video');
    video.src = src;
    video.loop = true;
    video.autoplay = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'metadata');
    /* Set muted both as attribute and as a property — the attribute
       alone is unreliable for satisfying autoplay-without-sound
       policies in some browsers. */
    video.muted = true;
    video.setAttribute('muted', '');

    /* Click-to-sound badge — a quiet line-art speaker pill that matches
       the rest of the site's iconography (stroke, no fill). Both icons
       live inside the button; CSS shows one or the other based on the
       `is-on` class so toggling is a single class flip. */
    var badge = document.createElement('button');
    badge.className = 'mosaic__sound';
    badge.type = 'button';
    badge.setAttribute('aria-label', 'Unmute');
    badge.innerHTML =
      '<svg class="mosaic__sound-icon mosaic__sound-icon--off" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M4 9.5 L8 9.5 L13 5.5 L13 18.5 L8 14.5 L4 14.5 Z"/>' +
        '<path d="M17 9 L21 15"/>' +
        '<path d="M21 9 L17 15"/>' +
      '</svg>' +
      '<svg class="mosaic__sound-icon mosaic__sound-icon--on" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M4 9.5 L8 9.5 L13 5.5 L13 18.5 L8 14.5 L4 14.5 Z"/>' +
        '<path d="M16.5 9 a4 4 0 0 1 0 6"/>' +
        '<path d="M19 6.5 a7.5 7.5 0 0 1 0 11"/>' +
      '</svg>';

    var syncBadge = function () {
      var on = !video.muted;
      badge.classList.toggle('is-on', on);
      badge.setAttribute('aria-label', on ? 'Mute' : 'Unmute');
      badge.setAttribute('aria-pressed', on ? 'true' : 'false');
    };

    var toggleSound = function (e) {
      if (e) {
        e.preventDefault();
        /* Badge sits inside fig and both have this handler — without
           stopping propagation a badge click fires twice and cancels
           itself out, leaving the video muted. */
        e.stopPropagation();
      }
      var willUnmute = video.muted;
      if (willUnmute) {
        /* Only one video may carry sound at a time — silence the rest. */
        videoTiles.forEach(function (other) {
          if (other !== video) {
            other.muted = true;
          }
        });
      }
      video.muted = !video.muted;
      videoTiles.forEach(function (other) {
        if (other.__syncBadge) other.__syncBadge();
      });
    };

    video.__syncBadge = syncBadge;

    /* Tile click → open preview (image + video tiles share this behaviour).
       Sound stays under the badge: the badge handler stops propagation so
       toggling sound does not also open the preview. */
    fig.addEventListener('click', function (e) {
      if (e && e.target && (e.target === badge || badge.contains(e.target))) return;
      MosaicPreview.open(index, fig);
    });
    fig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        MosaicPreview.open(index, fig);
      }
    });
    badge.addEventListener('click', toggleSound);

    /* Size the tile once metadata is in — do NOT wait for the full
       video to load. An error ticks the handshake too, so a missing
       file never stalls mosaic:ready. The scroll-into-view observer
       in script.js owns the actual settle (`.is-loaded`). */
    var sized = function () {
      classify(fig, video.videoWidth, video.videoHeight);
      tileSettled();
    };
    video.addEventListener('loadedmetadata', sized, { once: true });
    video.addEventListener('error', function () {
      tileSettled();
    }, { once: true });

    /* Same .mosaic__settle wrapper as image tiles. The sound badge stays
       a direct child of the figure so its absolute placement and z-index
       are not pulled along by Tile settle's transform. */
    var settle = document.createElement('div');
    settle.className = 'mosaic__settle';
    settle.appendChild(video);
    fig.appendChild(settle);
    fig.appendChild(badge);
    grid.appendChild(fig);

    videoTiles.push(video);
    if (io) io.observe(video);
  };

  media.forEach(function (item, index) {
    if (item.kind === 'video') {
      buildVideoTile(item.src, index);
    } else {
      buildImageTile(item.src, index);
    }
  });

  /* ============================================================
     The living Mosaic — shared rAF writer (scaffold)
     ------------------------------------------------------------
     A single requestAnimationFrame loop owns transform writes for
     all three "alive" layers (Frame drift, Tile settle, Gate shear).
     The loop self-stops when everything is at rest and is re-armed
     by input listeners. Under prefers-reduced-motion the engine is
     disabled and never installs listeners — the page behaves
     byte-for-byte as it does today.

     This slice (Slice 1) only stands up the scaffold; layers are
     registered by later slices via MosaicMotion.register(layer).
     ============================================================ */
  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var MosaicMotion = (function () {
    var layers = [];
    var state = {
      grid: grid,
      pointerX: 0,
      pointerY: 0,
      pointerInside: false,
      scrollY: window.pageYOffset || 0,
      scrollV: 0
    };
    var rafId = 0;

    /* The engine is a pure layer coordinator: it asks each registered
       layer whether it is at rest and sleeps when ALL agree. Layers
       own their own input/state checks (pointer for Frame drift desktop,
       position for Frame drift mobile, velocity for Gate shear). */
    var tick = function () {
      rafId = 0;
      var i;
      for (i = 0; i < layers.length; i++) layers[i].tick(state);
      var idle = true;
      for (i = 0; i < layers.length; i++) {
        if (!layers[i].atRest(state)) { idle = false; break; }
      }
      if (!idle) rafId = requestAnimationFrame(tick);
    };

    var request = function () {
      if (reducedMotion) return;
      if (rafId) return;
      rafId = requestAnimationFrame(tick);
    };

    var register = function (layer) {
      if (reducedMotion) return;
      layers.push(layer);
    };

    return {
      enabled: !reducedMotion,
      request: request,
      register: register,
      state: state
    };
  })();

  window.MosaicMotion = MosaicMotion;

  /* ============================================================
     Frame drift — desktop cursor (the living Mosaic, layer 1)
     ------------------------------------------------------------
     Photos drift toward the cursor inside their fixed frames. The
     grid layout never moves; only the img/video inside each frame
     translates, by a few pixels, eased toward the cursor's offset
     from the grid centre. Each tile has a deterministic depth
     factor (seeded from its index) so the collage reads as varied
     depth rather than one flat sheet. Pointer leaves the grid →
     drift decays to centre → the shared rAF sleeps.

     Mobile (no fine pointer) is handled in a separate layer.
     ============================================================ */
  (function frameDriftDesktop() {
    if (!MosaicMotion.enabled) return;
    if (!window.matchMedia ||
        !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var MAX_DRIFT = 7;       /* px — felt, not seen */
    var OVERSCAN  = 1.08;    /* matches CSS baseline; > max drift / half-frame */
    var EASE      = 0.12;    /* per-frame lerp toward target */
    var REST      = 0.0025;  /* normalized rest threshold */

    /* Collect each tile's media element + a deterministic per-tile
       depth factor in [0.45, 1.0). Golden-ratio fractions give a
       well-distributed sequence that's stable across renders. */
    var entries = [];
    Array.prototype.forEach.call(grid.querySelectorAll('.mosaic__item'), function (fig, i) {
      var node = fig.querySelector('img, video');
      if (!node) return;
      var frac = (i * 0.6180339887) % 1;
      entries.push({ node: node, depth: 0.45 + 0.55 * frac });
    });
    if (!entries.length) return;

    var actualX = 0, actualY = 0;
    var targetX = 0, targetY = 0;

    MosaicMotion.register({
      tick: function (state) {
        if (state.pointerInside) {
          var rect = grid.getBoundingClientRect();
          var halfW = rect.width  * 0.5 || 1;
          var halfH = rect.height * 0.5 || 1;
          var nx = (state.pointerX - (rect.left + halfW)) / halfW;
          var ny = (state.pointerY - (rect.top  + halfH)) / halfH;
          targetX = nx < -1 ? -1 : (nx > 1 ? 1 : nx);
          targetY = ny < -1 ? -1 : (ny > 1 ? 1 : ny);
        } else {
          targetX = 0;
          targetY = 0;
        }
        actualX += (targetX - actualX) * EASE;
        actualY += (targetY - actualY) * EASE;
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          var dx = (actualX * MAX_DRIFT * e.depth).toFixed(2);
          var dy = (actualY * MAX_DRIFT * e.depth).toFixed(2);
          e.node.style.transform =
            'translate3d(' + dx + 'px,' + dy + 'px,0) scale(' + OVERSCAN + ')';
        }
      },
      atRest: function (state) {
        /* While pointer is over the grid, never sleep — the target can
           change at any moment. Once it leaves, sleep when drift has
           decayed back to centre. */
        if (state.pointerInside) return false;
        return Math.abs(actualX) < REST && Math.abs(actualY) < REST;
      }
    });

    grid.addEventListener('pointermove', function (e) {
      MosaicMotion.state.pointerX = e.clientX;
      MosaicMotion.state.pointerY = e.clientY;
      MosaicMotion.state.pointerInside = true;
      MosaicMotion.request();
    });
    grid.addEventListener('pointerleave', function () {
      MosaicMotion.state.pointerInside = false;
      MosaicMotion.request();
    });
  })();

  /* ============================================================
     Frame drift — mobile scroll parallax (the living Mosaic, layer 1)
     ------------------------------------------------------------
     Touch devices don't have a pointer to chase, so the img drifts
     vertically with scroll position instead — anchored to the tile's
     own viewport-relative position so tiles at the bottom of a long
     page don't accumulate huge offsets. Same overscan baseline as
     desktop; same deterministic per-tile depth seed; no gyroscope
     and so no second permission prompt.
     ============================================================ */
  (function frameDriftMobile() {
    if (!MosaicMotion.enabled) return;
    if (window.matchMedia &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var MAX_DRIFT = 6;       /* px — slightly less than desktop drift */
    var OVERSCAN  = 1.08;    /* matches CSS baseline */
    var EASE      = 0.18;    /* per-frame lerp; scroll feels brisker */
    var REST      = 0.02;    /* px per-tile rest threshold */

    var entries = [];
    Array.prototype.forEach.call(grid.querySelectorAll('.mosaic__item'), function (fig, i) {
      var node = fig.querySelector('img, video');
      if (!node) return;
      var frac = (i * 0.6180339887) % 1;
      entries.push({
        fig: fig,
        node: node,
        depth: 0.45 + 0.55 * frac,
        actualY: 0,
        seeded: false
      });
    });
    if (!entries.length) return;

    var allClose = false;

    MosaicMotion.register({
      tick: function () {
        var vh = window.innerHeight || 1;
        var vcy = vh * 0.5;
        var nearAll = true;
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          var rect = e.fig.getBoundingClientRect();
          var tcy = rect.top + rect.height * 0.5;
          var raw = (vcy - tcy) / vh;
          if (raw < -1) raw = -1; else if (raw > 1) raw = 1;
          var target = raw * MAX_DRIFT * e.depth;
          if (!e.seeded) {
            /* Snap on first tick so the initial parallax pose doesn't
               visibly wobble into place when the page first paints. */
            e.actualY = target;
            e.seeded = true;
          } else {
            e.actualY += (target - e.actualY) * EASE;
          }
          if (Math.abs(target - e.actualY) > REST) nearAll = false;
          e.node.style.transform =
            'translate3d(0px,' + e.actualY.toFixed(2) + 'px,0) scale(' + OVERSCAN + ')';
        }
        allClose = nearAll;
      },
      atRest: function () { return allClose; }
    });

    window.addEventListener('scroll', function () {
      MosaicMotion.request();
    }, { passive: true });

    /* Initial arm so on-screen tiles get their parallax target
       immediately (the snap above means no wobble). */
    MosaicMotion.request();
  })();

  /* ============================================================
     Gate shear — momentum, kept subliminal (the living Mosaic, layer 3)
     ------------------------------------------------------------
     The whole grid shears as a single block in response to scroll
     velocity, like film running through a gate. Smoothed + clamped
     so a hard touch-flick eases in instead of snapping; decays back
     to 0° at rest within a few frames. Reverse scroll mirrors the
     shear naturally, no special-casing.
     ============================================================ */
  (function gateShear() {
    if (!MosaicMotion.enabled) return;

    var FACTOR   = 0.2;    /* deg per (px/ms) of smoothed velocity */
    var MAX_DEG  = 1.2;    /* hard ceiling even on violent flick */
    var SMOOTH   = 0.55;   /* low-pass on input velocity */
    var DECAY    = 0.70;   /* per-frame velocity decay */
    var LERP     = 0.35;   /* per-frame skew lerp */
    var REST_DEG = 0.01;
    var REST_V   = 0.002;

    var lastY = window.pageYOffset || 0;
    var lastT = performance.now();
    var smoothedV  = 0;    /* px/ms */
    var currentDeg = 0;

    MosaicMotion.register({
      tick: function () {
        /* Decay smoothed velocity so the grid eases back to 0° without
           requiring scroll events to stop it. */
        smoothedV *= DECAY;
        var targetDeg = smoothedV * FACTOR;
        if (targetDeg >  MAX_DEG) targetDeg =  MAX_DEG;
        if (targetDeg < -MAX_DEG) targetDeg = -MAX_DEG;
        currentDeg += (targetDeg - currentDeg) * LERP;
        if (Math.abs(currentDeg) < REST_DEG) currentDeg = 0;
        grid.style.transform = currentDeg
          ? 'skewY(' + currentDeg.toFixed(3) + 'deg)'
          : '';
      },
      atRest: function () {
        return Math.abs(smoothedV)  < REST_V &&
               Math.abs(currentDeg) < REST_DEG;
      }
    });

    window.addEventListener('scroll', function () {
      var now = performance.now();
      var y = window.pageYOffset || 0;
      var dt = Math.max(1, now - lastT);
      var instantV = (y - lastY) / dt;
      smoothedV = smoothedV * SMOOTH + instantV * (1 - SMOOTH);
      lastY = y;
      lastT = now;
      MosaicMotion.request();
    }, { passive: true });
  })();
})();
