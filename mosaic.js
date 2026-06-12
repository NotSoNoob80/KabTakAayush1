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
  if (eyebrowEl) eyebrowEl.textContent = 'Project ' + project.id + ' — ' + (project.typeLabel || 'Photo Series');
  if (docTitleEl) docTitleEl.textContent = project.title + ' — KabTakAayush';

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

  var buildImageTile = function (src) {
    var fig = document.createElement('figure');
    fig.className = 'mosaic__item';

    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    /* Eager, not lazy: the scattered-entrance sequence needs every
       tile's true aspect ratio (and therefore its final grid span)
       known up front, so positions don't shift mid-assembly. These
       are the very photos a visitor came to this page to see. */
    img.loading = 'eager';
    img.decoding = 'async';

    var reveal = function () {
      classify(fig, img.naturalWidth, img.naturalHeight);
      fig.classList.add('is-loaded');
      tileSettled();
    };

    if (img.complete && img.naturalWidth) {
      reveal();
    } else {
      img.addEventListener('load', reveal, { once: true });
      img.addEventListener('error', function () {
        fig.classList.add('is-loaded');
        tileSettled();
      }, { once: true });
    }

    fig.appendChild(img);
    grid.appendChild(fig);
  };

  var buildVideoTile = function (src) {
    var fig = document.createElement('figure');
    fig.className = 'mosaic__item mosaic__item--video';

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

    /* Click-to-sound badge — starts muted (🔇). */
    var badge = document.createElement('button');
    badge.className = 'mosaic__sound';
    badge.type = 'button';
    badge.setAttribute('aria-label', 'Toggle sound');
    badge.textContent = '🔇';

    var syncBadge = function () {
      badge.textContent = video.muted ? '🔇' : '🔊';
    };

    var toggleSound = function (e) {
      if (e) e.preventDefault();
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

    fig.addEventListener('click', toggleSound);
    badge.addEventListener('click', toggleSound);

    /* Settle the tile (and size it) once metadata is in — do NOT wait
       for the full video to load. An error settles it too, so a missing
       file never stalls the mosaic:ready handshake. */
    var sized = function () {
      classify(fig, video.videoWidth, video.videoHeight);
      fig.classList.add('is-loaded');
      tileSettled();
    };
    video.addEventListener('loadedmetadata', sized, { once: true });
    video.addEventListener('error', function () {
      fig.classList.add('is-loaded');
      tileSettled();
    }, { once: true });

    fig.appendChild(video);
    fig.appendChild(badge);
    grid.appendChild(fig);

    videoTiles.push(video);
    if (io) io.observe(video);
  };

  media.forEach(function (item) {
    if (item.kind === 'video') {
      buildVideoTile(item.src);
    } else {
      buildImageTile(item.src);
    }
  });
})();
