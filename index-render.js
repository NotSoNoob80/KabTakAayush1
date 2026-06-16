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

  /* Entrance cascade. An earlier version used `data-reveal` +
     IntersectionObserver and had rows stick at opacity 0 below the fold
     while the list scrolled inside a fixed-height container. ADR 0007
     deleted that internal-scroll container (the whole page scrolls now),
     so the cascade is driven purely by CSS instead: each <li> carries its
     own `--row-i` and `.index__list li` animates in once on load with a
     small per-row `animation-delay`. No observer, no scroll dependency —
     so it cannot get stuck, and it honours `prefers-reduced-motion` in CSS. */
  var rows = PROJECTS.map(function (p, i) {
    var thumb = thumbOf(p);
    var title = p.title || '';

    return '' +
      '<li style="--row-i:' + i + '">' +
        '<a class="index__item" href="project.html?id=' + p.id + '"' +
           ' data-thumb="' + esc(thumb) + '" data-type="' + esc(p.type || '') + '">' +
          '<span class="index__num">' + esc(p.id) + '</span>' +
          '<span class="index__title" data-title="' + esc(title) + '">' + esc(title) + '</span>' +
          /* Meta is emitted at every width; CSS hides it below the desktop
             breakpoint so the renderer stays one code path and the static
             markup is uniform at every viewport. Empty string when the
             Manifest entry is missing `meta`, so the row's flex layout is
             unaffected by partial data. */
          '<span class="index__meta">' + esc(p.meta || '') + '</span>' +
        '</a>' +
      '</li>';
  }).join('');

  list.innerHTML = rows;
})();
