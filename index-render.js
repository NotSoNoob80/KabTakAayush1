/* ============================================================
   PROJECT INDEX — RENDERER
   ------------------------------------------------------------
   Builds the Projects index rows from the Manifest (PROJECTS in
   projects-data.js) instead of hand-written <li>s, so the list
   and the Mosaic can never drift apart. Runs synchronously,
   between projects-data.js and script.js (both at end of body),
   so the rows exist in the DOM before script.js wires up the
   hover / preview / touch behaviour. See docs/adr/0004.
   ============================================================ */

(function () {
  'use strict';

  var list = document.getElementById('project-index-list');
  if (!list || typeof PROJECTS === 'undefined') return;

  /* Path-builder shared with the rest of the site. Falls back to the
     literal convention if the helper isn't present. */
  var thumbOf = (typeof projectThumbnail === 'function')
    ? projectThumbnail
    : function (p) { return 'assets/projects/' + p.id + '/thumbnail/thumbnail.webp'; };

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* No `data-reveal` on the index rows. The list scrolls inside a fixed-
     height container, so items below the fold (and sometimes the visible
     ones, depending on observer timing inside an `overflow: hidden`
     ancestor) were getting stuck at opacity 0 — the page looked like it
     was "missing" projects on desktop. The list is short enough that a
     staggered entrance wasn't earning its keep; it's worth the trade for
     reliability. */
  var rows = PROJECTS.map(function (p, i) {
    var active = i === 0 ? ' is-active' : '';
    var thumb = thumbOf(p);
    var meta = p.meta || '';
    var title = p.title || '';

    return '' +
      '<li>' +
        '<a class="index__item' + active + '" href="project.html?id=' + p.id + '"' +
           ' data-thumb="' + esc(thumb) + '" data-type="' + esc(p.type || '') + '"' +
           ' data-meta="' + esc(meta) + '">' +
          '<span class="index__num">' + esc(p.id) + '</span>' +
          '<span class="index__title" data-title="' + esc(title) + '">' + esc(title) + '</span>' +
          '<span class="index__cue" aria-hidden="true">View project &rarr;</span>' +
        '</a>' +
      '</li>';
  }).join('');

  list.innerHTML = rows;

  /* Seed the hover-preview frame from the first project so the right-hand
     column isn't empty before the first hover (matches the old hardcoded
     seed, but driven by the Manifest). */
  var first = PROJECTS[0];
  if (first) {
    var previewImg = document.getElementById('project-index-preview-img');
    var previewMeta = document.getElementById('project-index-preview-meta');
    if (previewImg) {
      previewImg.src = thumbOf(first);
      previewImg.alt = first.title || '';
    }
    if (previewMeta) previewMeta.textContent = first.meta || '';
  }
})();
