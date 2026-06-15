# Plan — Make the full Projects list reachable on desktop (stop the footer "hiding" projects)

- Status: Proposed
- Date: 2026-06-15
- Scope: `projects.html`, `styles.css`, `script.js`. No data or layout-family change.
- Target: the **desktop pinned layout** (`>980px`, hover/fine pointer). Phones/compact
  layout are unaffected (and were never affected — see Diagnosis).

## Goal

On desktop the Projects index keeps its signature **one-screen pinned tableau** —
`.index` fills the viewport and the title list scrolls *internally* — but a visitor
must be able to tell that the list continues past the fold, so the bottom projects
never read as "hidden by the footer." With 12 projects today, four titles
(Lights and Shadows, Before Christmas, Chor Bazaar, Anatomy of a flip) live below
the fold of the internal scroll and are easy to miss.

## Diagnosis (confirmed in-browser at 1440×820)

The page has **two competing scroll contexts** on desktop:

- `.index` is pinned to one screen — `height: calc(100vh - var(--nav-h)); overflow: hidden`
  ([styles.css:1102](../styles.css)).
- `.index__list` scrolls inside its own column — `overflow-y: auto;
  overscroll-behavior: contain` ([styles.css:1116](../styles.css)). Measured:
  `scrollHeight 1149 > clientHeight 738` → the bottom **4 of 12** titles are only
  reachable by scrolling *inside the list*.
- The **footer** sits in normal flow directly below the pinned pane
  ([styles.css:2203](../styles.css)), so the whole **page** is also scrollable
  (`scrollHeight 1651`).

Because `overscroll-behavior: contain` keeps a wheel-over-the-list inside the list,
and the preview pane isn't scrollable, the intended routing already works:

- **Wheel over the list → the list scrolls** (reveals projects 9–12).
- **Wheel over the right side / off the list → the page scrolls → the footer rises.**

The defect is therefore **not** broken mechanics — it is **discoverability**. A
visitor who scrolls the page (cursor off the list) sees the footer wordmark rise and
reads "Supreme 2" (project 8) as the last project; the internal list is still at
`scrollTop 0`, so 9–12 are never seen and the footer appears to have swallowed them.

The list grew from "today's five titles" (per the comment at
[styles.css:1120](../styles.css) and [index-render.js:36](../index-render.js)) to
**12** ([projects-data.js](../projects-data.js)), which is what pushed it over one
screen and surfaced the problem.

**Why phones are immune:** at `≤980px`, `.index` becomes `height: auto;
overflow: visible` ([styles.css:1450](../styles.css)) and the page flows naturally;
the list is an obviously-bounded `46vh` box ([styles.css:1461](../styles.css)) and
the footer is a clearly separate section below the whole flowed page. No pinned pane,
no dual-scroll confusion.

## Decisions locked (from the grilling session)

1. **Keep the one-screen pinned tableau** on desktop — do *not* switch desktop to the
   phone-style natural page scroll. The internally-scrolling list stays.
2. **Footer access is by design:** the list scrolls when the cursor is over it; the
   page scrolls to the footer when the cursor is off the list (right side). This is
   the existing `overscroll-behavior: contain` behaviour — keep it, do not gate or
   hijack it.
3. **Fix the defect with a persistent "more-below" cue** on the list, so the extra
   projects are discoverable and the footer never reads as the end.
4. **Cue form:** a small gold **down-chevron + project count** ("12 PROJECTS"),
   anchored at the bottom of the list, shown only while there are un-scrolled titles
   below, fading out once the list reaches its end.
5. **Cue scope:** the **desktop pinned layout only** (`>980px`). The compact `46vh`
   list is left exactly as it is today.

## Root cause (one line)

The desktop index is a fixed one-screen pane whose list overflows internally, but
nothing tells the visitor the list continues — so page-scroll reveals the footer
before the visitor discovers projects 9–12.

## Changes

### A. Markup — add the cue to the list column (`projects.html`)

Add an `aria-hidden` cue as the last child of `.index`, after the `<ul>`
([projects.html:36](../projects.html)). It is decorative: screen readers still get
the 12 real `<a>` rows directly.

```html
<ul class="index__list" id="project-index-list"></ul>

<!-- Desktop-only "more below" cue. Hidden until script.js measures an
     overflowing list and adds `has-more` to `.index`. -->
<div class="index__more" aria-hidden="true">
  <span class="index__more-count" id="project-index-count"></span>
  <span class="index__more-chevron">&darr;</span>
</div>
```

### B. CSS — position, reveal, and motion (`styles.css`)

Anchor the cue to the bottom of the list column and reveal it only when
`.index` carries `has-more`. Add `position: relative` to the existing `.index` rule
([styles.css:1102](../styles.css)) so the absolute cue is positioned against the pane.

```css
.index { position: relative; }            /* add to the existing rule */

.index__more {
  position: absolute;
  left: 48px;                              /* matches .index horizontal padding */
  bottom: 22px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--text);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0;
  transform: translateY(4px);
  pointer-events: none;                    /* never eats a click meant for a row */
  transition: opacity 300ms var(--ease-out), transform 300ms var(--ease-out);
}

.index.has-more .index__more { opacity: 1; transform: none; }

.index__more-chevron {
  display: inline-block;
  animation: index-more-bob 1.6s var(--ease-out) infinite;
}

@keyframes index-more-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(3px); }
}

/* Compact layout never shows the cue (JS also won't toggle it there). */
@media (max-width: 980px) {
  .index__more { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .index__more { transition: none; }
  .index__more-chevron { animation: none; }
}
```

The cue sits over the list's existing bottom mask fade
([styles.css:1131](../styles.css)) — the fade reads as "more below," the cue names
how much.

### C. JS — measure overflow, set the count, toggle visibility (`script.js`)

All of this goes inside the **existing desktop branch**
`else if (indexList && indexPreviewImg)` at [script.js:929](../script.js) — that
branch runs only when `indexInlineThumbs` is false, i.e. exactly the desktop pinned
layout (scope decision #5), and it already holds `indexItems` and `indexList`.

```js
// "More below" cue — only meaningful here, where the list scrolls internally.
var indexEl   = document.getElementById('project-index');
var moreCue   = document.querySelector('.index__more');
var countEl   = document.getElementById('project-index-count');
if (countEl) countEl.textContent = indexItems.length + ' Projects';

function updateMoreCue() {
  if (!indexEl) return;
  var remaining = indexList.scrollHeight - indexList.clientHeight - indexList.scrollTop;
  indexEl.classList.toggle('has-more', remaining > 8);   // 8px slack past the fade
}
indexList.addEventListener('scroll', updateMoreCue, { passive: true });
window.addEventListener('resize', updateMoreCue);
updateMoreCue();   // initial state after rows are rendered
```

- Count comes from `indexItems.length` (the rendered rows), so it tracks the Manifest
  automatically as projects are added — no hand-maintained number.
- `remaining > 8` hides the cue the moment the list is scrolled to (or near) its end,
  so it never lingers over the last project.
- Runs after `index-render.js` has built the rows (script.js loads last —
  [projects.html:77-79](../projects.html)), so the measurement is valid on load.

## Why not the alternatives (rejected in grilling)

- **Let the desktop page scroll naturally (phone model).** Rejected — it sacrifices
  the pinned one-screen tableau, the centred pivot, and the fixed hover preview pane.
- **Gate / hijack the footer until the list bottoms out.** Rejected — fragile
  scroll-chaining, and it overrides the deliberate "scroll the right side to reach the
  footer" interaction.
- **Auto-shrink rows to fit all titles on one screen.** Rejected — breaks again every
  time a project is added past what fits.

## Out of scope

- The compact / phone layout (`≤980px`) — untouched.
- The wheel-routing itself (`overscroll-behavior: contain`) — already correct, kept.
- The footer, the preview pane, the Manifest, and `index-render.js`'s row markup —
  unchanged (JS only *reads* the rendered rows).

## Verification matrix

Desktop widths (>980px), several heights, with the current 12-project Manifest:

| Viewport   | Why |
|------------|-----|
| 1440×900   | Roomy desktop — fewer rows overflow; cue must still appear if any do |
| 1440×820   | The reproduced case — 4 titles below the fold |
| 1280×720   | Shorter desktop — more titles overflow |
| 1024×680   | Just above the 980px breakpoint — cue still desktop layout |
|  980×800   | At the breakpoint — cue must be **gone** (compact layout) |

For each, confirm:

- [ ] On load with an overflowing list, the cue shows the correct count and a chevron.
- [ ] Scrolling the list to the last project hides the cue (`has-more` removed).
- [ ] Scrolling back up re-shows it.
- [ ] Wheel over the list scrolls the list; wheel over the right side scrolls the page
      to the footer (unchanged).
- [ ] The cue never overlaps or blocks a project row's click target.
- [ ] At ≤980px the cue is absent and the compact list behaves as before.
- [ ] `prefers-reduced-motion`: chevron is static, cue still appears/disappears.
- [ ] If the Manifest is trimmed so the list fits one screen, the cue never appears.

## Documentation

- **CONTEXT.md** — add the **more-below cue** to "Things on the screen" (done inline
  this session).
- **ADR 0006** — record the load-bearing choice to keep the desktop pinned tableau +
  internally-scrolling list (rather than the phone-style natural page scroll), since a
  future reader will reasonably ask "why not just let the page scroll like mobile?"

## Side observation (not part of this fix)

CONTEXT.md says the index is "flanked by the **wordmark pivot** and the preview pane,"
and `.index` reserves a middle `auto` grid column for it
([styles.css:1104](../styles.css)), but `projects.html` has **no `.index__mark`
element** — the middle column is empty. This is pre-existing doc/markup drift, not
caused or fixed here; flag for a separate cleanup (resolve whether the pivot was
intentionally removed, then update CONTEXT.md or restore the markup).
