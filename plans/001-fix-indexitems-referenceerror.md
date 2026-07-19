# 001 — Fix the `indexItems` ReferenceError on projects.html

- **Status**: DONE (implemented + verified 2026-07-19)
- **Commit**: f9a3ae9
- **Severity**: HIGH
- **Category**: Purpose & frequency (correctness — a thrown error kills interaction wiring)
- **Estimated scope**: 1 file, ~3 lines

## Problem

`script.js` references `indexItems` at line 1407, but no file in the repo defines it.
The identifier was orphaned by the projects-index rework — `docs/projects-index-inplace-preview-plan.md:146`
even flagged "`indexItems`, defined elsewhere — confirm it still resolves after the cut",
and it never got confirmed.

```js
/* script.js:1401–1415 — current */
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
```

Because `&&` short-circuits, the bare `indexItems` is only ever *evaluated* on
**projects.html** (the one page where `indexList` — `document.getElementById('project-index-list')`,
script.js:1053 — is truthy). There it throws `ReferenceError: indexItems is not defined`
during initial script execution, which aborts the rest of the IIFE. On projects.html this
silently kills:

- easter egg 4 itself (the "still deciding?" index nudge),
- easter egg 5 (the ~50s idle line, script.js:1417–1442),
- easter egg 6 (the hidden `a t 8 0` key sequence, script.js:1444–1465),
- the `.btn` press-feedback wiring (script.js:1469–1478 — no `.btn` exists on
  projects.html today, but anything added after line 1407 in future dies with it),

plus a console error on every projects.html load. All other pages are unaffected only
by luck of the short-circuit.

## Target

Define `indexItems` as the rendered project rows (the `.index__item` anchors that
`index-render.js` builds — script.js runs after it, so they exist in the DOM), just
above the guard:

```js
/* target — script.js, replacing the guard at ~1407 */
    var indexItems = indexList
      ? Array.prototype.slice.call(indexList.querySelectorAll('.index__item'))
      : [];
    if (indexList && indexItems.length > 2) {
      var indexPicked = false;
      indexItems.forEach(function (item) {
        item.addEventListener('click', function () { indexPicked = true; });
      });
      window.setTimeout(function () {
        if (!indexPicked) showEgg(pickEggLine('index', INDEX_EGG_LINES));
      }, 10000);
    }
```

## Repo conventions to follow

- Array-from-NodeList uses `Array.prototype.slice.call(...)` in this codebase —
  exemplar: `script.js:469` (`Array.prototype.slice.call(introGrid.querySelectorAll('.mosaic__item'))`).
- `var`, ES5 function style, no arrow functions — match the surrounding file.

## Steps

1. In `script.js`, insert the `var indexItems = …` declaration shown above
   immediately after the `INDEX_EGG_LINES` array closes (after line 1406) and
   change the guard from `if (indexList && indexItems && indexItems.length > 2)`
   to `if (indexList && indexItems.length > 2)`.

## Boundaries

- Do NOT touch any other easter-egg block, `index-render.js`, or the CSS.
- Do NOT rename anything or refactor the egg block.
- If line 1407 no longer matches the excerpt above (drift since f9a3ae9), STOP and report.

## Verification

- **Mechanical**: `node --check script.js` exits clean (syntax only; the repo has no build).
- **Feel check**: serve the site (`npx serve .` or any static server), open `projects.html`
  with DevTools console open:
  - No `ReferenceError` on load.
  - Leave the page untouched for ~10s without clicking a row → the "still deciding?"
    toast appears beside the cursor.
  - Type `a` `t` `8` `0` → the secret-sequence toast appears.
  - Leave idle ~50s → the idle toast appears.
- **Done when**: projects.html loads with zero console errors and all three toasts above can fire.
