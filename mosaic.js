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

  /* ============================================================
     Project-wide sound state
     ------------------------------------------------------------
     The Mosaic keeps its long-standing invariant: at most ONE video
     carries sound at a time. `projectSoundOn` is simply "is any video
     currently unmuted". The universal toggle (built only when a project
     has more than one video) mirrors it and acts as a bulk control; the
     per-tile badges feed the same state; and while it is on the audible
     video follows the scroll — the tile coming into view takes the
     sound. It lives only in memory, so leaving the page (or a reload)
     resets it to its default off — the toggle is never persisted.
     ============================================================ */
  var projectSoundOn = false;
  var universalToggle = null;   /* built lazily only when videoTiles.length > 1 */

  /* The two line-art speaker glyphs, shared by the per-tile badge and
     the universal toggle so both read as the same control. CSS shows
     one or the other based on the `is-on` class on the button. */
  var SOUND_ICONS_HTML =
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

  var syncUniversalToggle = function () {
    if (!universalToggle) return;
    universalToggle.classList.toggle('is-on', projectSoundOn);
    universalToggle.setAttribute('aria-pressed', projectSoundOn ? 'true' : 'false');
    universalToggle.setAttribute('aria-label',
      projectSoundOn ? 'Turn project sound off' : 'Turn project sound on');
    var label = universalToggle.querySelector('.mosaic-sound-toggle__label');
    if (label) label.textContent = projectSoundOn ? 'Sound on' : 'Sound off';
  };

  /* Push the current mute state out to every per-tile badge and the
     universal toggle so the whole page agrees. */
  var syncAllBadges = function () {
    for (var i = 0; i < videoTiles.length; i++) {
      if (videoTiles[i].__syncBadge) videoTiles[i].__syncBadge();
    }
    syncUniversalToggle();
  };

  /* Unmute exactly `video`, silence every other tile (the one-at-a-time
     invariant), and mark the project as sounding. */
  var setUnmuted = function (video) {
    for (var i = 0; i < videoTiles.length; i++) {
      videoTiles[i].muted = (videoTiles[i] !== video);
    }
    projectSoundOn = true;
    syncAllBadges();
  };

  /* Silence everything and drop out of sound mode. */
  var muteAll = function () {
    for (var i = 0; i < videoTiles.length; i++) videoTiles[i].muted = true;
    projectSoundOn = false;
    syncAllBadges();
  };

  /* When the universal toggle is switched on, hand sound to whichever
     video is most worth hearing right now: the playing tile with the
     largest area on screen, falling back to the first playing tile, then
     to the first tile of all. */
  var pickAudibleCandidate = function () {
    var best = null, bestArea = -1;
    var vh = window.innerHeight || 0, vw = window.innerWidth || 0;
    for (var i = 0; i < videoTiles.length; i++) {
      var v = videoTiles[i];
      if (v.paused) continue;
      var r = v.getBoundingClientRect();
      var visW = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      var visH = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      var area = visW * visH;
      if (area > bestArea) { bestArea = area; best = v; }
    }
    return best || videoTiles[0] || null;
  };

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
            /* While the project is sounding, the audible video follows
               the scroll: the tile coming into view takes the sound. */
            if (projectSoundOn && vid.muted) setUnmuted(vid);
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
    badge.innerHTML = SOUND_ICONS_HTML;

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
      /* Manual per-tile control still works regardless of the universal
         toggle. Unmuting this tile silences the rest and turns project
         sound on; muting the (only) audible tile turns it off. Both feed
         the same shared state, so the universal toggle stays truthful. */
      if (video.muted) {
        setUnmuted(video);
      } else {
        muteAll();
      }
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
    /* Film-only Mosaics use the Spotlight selection layer to drive play/
       pause directly; the shared "≥25 % visible" IO rule does not govern
       these tiles. Mixed and photo-only paths keep the IO behaviour. */
    if (io && !isFilmOnly) io.observe(video);
  };

  media.forEach(function (item, index) {
    if (item.kind === 'video') {
      buildVideoTile(item.src, index);
    } else {
      buildImageTile(item.src, index);
    }
  });

  /* ============================================================
     Universal (project-wide) sound toggle
     ------------------------------------------------------------
     Only meaningful when there is more than one video to switch
     between, so it is built only then. Injected into the page header
     so it sits "on top of" the project. Turning it on hands sound to
     the most-visible playing video and puts the page into follow-the-
     scroll sound mode; turning it off silences everything. The per-tile
     badges remain fully usable either way.
     ============================================================ */
  (function buildUniversalSoundToggle() {
    if (videoTiles.length <= 1) return;
    /* The universal toggle returns on a Spotlight too: it is the
       project-level on/off master, while the lit film's speaker badge
       remains the per-film control. Both flip the same projectSoundOn
       state, so they stay in sync — turning the universal toggle on
       hands sound to the most-visible playing video (which, on a
       Spotlight, is always the lit film), and handoff carries it. */
    var head = document.querySelector('.page-head');
    if (!head) return;

    universalToggle = document.createElement('button');
    universalToggle.type = 'button';
    universalToggle.className = 'mosaic-sound-toggle';
    universalToggle.innerHTML =
      SOUND_ICONS_HTML +
      '<span class="mosaic-sound-toggle__label">Sound off</span>';

    universalToggle.addEventListener('click', function () {
      if (projectSoundOn) {
        muteAll();
      } else {
        var pick = pickAudibleCandidate();
        if (pick) {
          setUnmuted(pick);
        } else {
          projectSoundOn = true;
          syncAllBadges();
        }
      }
    });

    head.appendChild(universalToggle);
    syncUniversalToggle();
  })();

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

     Skipped entirely on any mosaic that contains video: gate shear
     writes a per-frame transform to the WHOLE grid, which forces the
     browser to re-composite the entire subtree each scroll frame —
     and that subtree's decoding <video> surfaces make it the heaviest
     scroll-time cost on the page. The effect is subliminal (±1.2°), so
     dropping it on video pages trades nothing visible for noticeably
     smoother scrolling (especially on weaker mobile GPUs). videoTiles
     is fully populated by the media loop above before this runs, so the
     count is accurate. One-line revert: delete this guard.
     ============================================================ */
  (function gateShear() {
    if (!MosaicMotion.enabled) return;
    if (videoTiles.length > 0) return;

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

  /* ============================================================
     The Spotlight — film-only selection layer
     ------------------------------------------------------------
     For film-only Mosaics, pick the lit film from the sightline
     (viewport vertical centre) with a hysteresis dead-band, toggle
     `.is-lit` on exactly one figure, and drive playback directly
     (replacing the IO ≥25 %-visible rule for this path). CSS owns
     every visual transition — this layer writes one class and
     nothing else per frame.

     Two schedulers, one decision function. With the rAF engine
     enabled (default), the layer registers on MosaicMotion and rides
     the shared loop. Under `prefers-reduced-motion: reduce` the
     engine no-ops, so a small rAF-coalesced scroll/resize listener
     runs the same `decide` directly — the LOGIC (one film at a time,
     handoff, sound following) is preserved, only the MOTION drops.

     See docs/prd/the-spotlight.md, plan-the-spotlight.md, ADR 0013.
     ============================================================ */
  (function spotlight() {
    if (!isFilmOnly) return;

    /* px — a candidate must beat the current lit film's distance by
       this much before it takes over. Large enough to silence midpoint
       jitter; small enough to be invisible during deliberate scroll. */
    var HYSTERESIS_PX = 60;

    var films = [];
    Array.prototype.forEach.call(
      grid.querySelectorAll('.mosaic__item--video'),
      function (fig) {
        var video = fig.querySelector('video');
        if (video) films.push({ fig: fig, video: video });
      }
    );
    if (!films.length) return;

    var litIdx = -1;

    var setLit = function (idx) {
      if (idx === litIdx) return;
      if (litIdx >= 0) {
        films[litIdx].fig.classList.remove('is-lit');
        try { films[litIdx].video.pause(); } catch (e) { /* ignore */ }
      }
      litIdx = idx;
      if (litIdx >= 0) {
        films[litIdx].fig.classList.add('is-lit');
        var p = films[litIdx].video.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
        /* Audio follows the lit film. If the project is sounding,
           hand sound to the new lit film — setUnmuted mutes every
           other video and unmutes this one, syncing badges. We only
           call it when projectSoundOn is ALREADY true; otherwise it
           would flip the state on every handoff. projectSoundOn is
           the single source of truth and only the per-tile badge or
           the (suppressed) universal toggle ever flips it. */
        if (projectSoundOn) setUnmuted(films[litIdx].video);
      }
    };

    /* The video tags carry `autoplay`, which fires the moment metadata
       loads — sometimes before our first tick, often staggered across
       all 14 films. Without this guard, every film starts playing and
       only the lit one ever gets explicitly paused. Listening for the
       `play` event on each video catches BOTH initial autoplay AND
       MosaicPreview's on-close resume (which re-plays every paused
       inline tile) and pauses anything that isn't the current lit film.
       When setLit calls play() on the lit film, litIdx === i at the
       moment the event fires, so the guard correctly lets it through.
       Runs in both modes — autoplay isn't motion. */
    films.forEach(function (f, i) {
      f.video.addEventListener('play', function () {
        if (i !== litIdx) {
          try { f.video.pause(); } catch (e) { /* ignore */ }
        }
      });
    });

    var sightlineY = function () { return (window.innerHeight || 1) * 0.5; };

    var distanceTo = function (fig, vcy) {
      var r = fig.getBoundingClientRect();
      return Math.abs(r.top + r.height * 0.5 - vcy);
    };

    var pickNearest = function (vcy) {
      var bestIdx = -1, bestDist = Infinity;
      for (var i = 0; i < films.length; i++) {
        var d = distanceTo(films[i].fig, vcy);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      return { idx: bestIdx, dist: bestDist };
    };

    /* Shared decision step — used by both the rAF engine tick and the
       reduced-motion scroll listener. Hysteresis: candidate must be
       HYSTERESIS_PX closer to the sightline than the current lit film
       to take over. Stops the lit state from swapping on every pixel
       of micro-jitter when two films are near-equidistant. */
    var decide = function () {
      var vcy = sightlineY();
      var p = pickNearest(vcy);
      if (p.idx < 0) return;
      if (litIdx < 0) { setLit(p.idx); return; }
      if (p.idx === litIdx) return;
      var litDist = distanceTo(films[litIdx].fig, vcy);
      if (litDist - p.dist > HYSTERESIS_PX) setLit(p.idx);
    };

    /* Single-film projects: nothing to hand off, so just light the one
       film on ready and skip both schedulers. The class still drives
       the CSS pose (or the instant pose under reduced motion); play()
       is best-effort under autoplay policies. */
    if (films.length === 1) {
      grid.addEventListener('mosaic:ready', function () {
        setLit(0);
      }, { once: true });
      return;
    }

    if (MosaicMotion.enabled) {
      /* Engine path — register a layer on the shared rAF. Transition
         tracking keeps the engine awake mid-handoff so atRest only
         goes true once every rise/dim/ring transition settles. */
      var transitionPending = 0;
      films.forEach(function (f) {
        f.fig.addEventListener('transitionrun', function () {
          transitionPending++;
        });
        var release = function () {
          if (transitionPending > 0) transitionPending--;
          MosaicMotion.request();
        };
        f.fig.addEventListener('transitionend', release);
        f.fig.addEventListener('transitioncancel', release);
      });

      MosaicMotion.register({
        tick: function () { decide(); },
        atRest: function () { return transitionPending === 0; }
      });

      /* Arm after mosaic:ready (like the other living-Mosaic layers)
         so the from-index scattered-to-structured intro is unaffected.
         On arm, the rAF runs once and pickNearest lights the topmost
         film (nearest the sightline at scroll y=0). */
      grid.addEventListener('mosaic:ready', function () {
        MosaicMotion.request();
      }, { once: true });

      window.addEventListener('scroll', function () {
        MosaicMotion.request();
      }, { passive: true });

      window.addEventListener('resize', function () {
        MosaicMotion.request();
      });
    } else {
      /* Reduced-motion fallback — the rAF engine is disabled in this
         mode, so we coalesce scroll/resize into a single rAF callback
         and call decide() directly. No transition tracking is needed
         because the @media block zeros every Spotlight transition;
         class swaps land instantly. This branch is gated on
         !MosaicMotion.enabled so there is never a second writer when
         the engine is on. */
      var scheduled = false;
      var schedule = function () {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(function () {
          scheduled = false;
          decide();
        });
      };

      grid.addEventListener('mosaic:ready', schedule, { once: true });
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
    }
  })();
})();
