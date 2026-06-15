# Plan — Replace the desktop left-rail preview with an in-place row "preview"

- Status: Proposed
- Date: 2026-06-16
- Scope: `projects.html`, `styles.css`, `script.js`, `index-render.js` (preview seed only),
  plus docs. **No data change. The footer is not touched.**
- Target: the **Projects index** (`projects.html`) — what we informally call the
  "product list page." Mobile/tablet visual output is preserved; the change is on
  desktop pointer devices.

## Goal

Make the desktop hover affordance on the Projects index *feel correct*. Today a row
hover pops a big image into the **left-rail preview** — fixed at the far left of the
viewport, vertically centred, showing the same photo the row's own inline thumbnail is
already revealing. Replace that with an **in-place "preview"**: the row's own inline
thumbnail enlarges and blooms to colour where it already sits. One coherent layout at
every width, the affordance lives where the action is, and the page reads as a calm
photographer's contact sheet rather than a desktop-special with a floating panel.

## Why the current preview "doesn't feel correct" (design read)

Diagnosed live at 1440×820 and against the code, through Emil Kowalski's framework:

1. **Spatially disconnected.** You hover a row on the *right* of a wide column; the
   preview appears fixed at the *left* (`position: fixed; left: clamp(20px,3vw,60px);
   top: 50%`, [styles.css:1175](../styles.css)) and **never tracks the hovered row** —
   it stays vertically centred. The eye ping-pongs. Emil's first motion rule is spatial
   consistency; this breaks it.
2. **Redundant.** Each row already owns an inline thumbnail that drops grayscale→colour
   on hover ([styles.css:1026](../styles.css)). The left-rail preview shows the **same
   image again**, bigger, elsewhere — two copies of one photo for one hover.
3. **Two desktop layouts + fragile breakpoint.** Below 1100px the list is centred; at
   ≥1100px the whole list yanks ~400px right (`margin-left: 396px` measured) to reserve
   the preview's column ([styles.css:1169](../styles.css)). The preview is gated
   `(hover:hover) and (pointer:fine) and (min-width:1100px)` in **both** CSS
   ([styles.css:1155](../styles.css)) and the JS `matchMedia`
   ([script.js:875](../script.js)). A 1366×768 laptop at 125% display scaling reports
   ~1093 CSS px — *just under* the gate — so the most common Windows laptop never sees
   the preview at all.
4. **Over-animated for its frequency.** Row hover is a "tens-of-times-per-session"
   interaction. Emil's guidance for that frequency is *remove or drastically reduce* — a
   full-size image flying in from the far edge is the opposite.
5. **The project already decided this once.** [ADR 0007](adr/0007-projects-index-unified-inline-thumbnail-list.md)
   deleted this exact preview pane as "dead weight" and called the inline contact-sheet
   "the stronger page." It was later re-added (CONTEXT.md "the left-rail preview" entry).
   Removing it again re-affirms 0007 rather than inventing a new direction.

## Decisions locked (from the grilling session)

1. **Direction: remove the left-rail preview entirely** — markup, CSS, JS, the
   `index-render.js` first-project seed (if any), and the ≥1100px right-anchor layout it
   forces. Back to **one centred-column layout at every width** (ADR 0007's model).
2. **The row is the preview.** On a pointer device, hovering a row **enlarges its inline
   thumbnail in place** (~1.2× from its left edge, transform-only — no reflow) while it
   blooms grayscale→colour; the title keeps its quiet nudge + gold tint. This delivers
   the "bigger image on hover" payoff the preview was reaching for, but spatially correct
   and on the single layout. (Chosen over "subtle, colour only" and "bold, whole-row
   lift".)
3. **Tighten the hover timing.** Drop the current 460ms hover transitions to **~220ms
   `var(--ease-out)`** — the project's standard interaction curve/duration
   ([styles.css:21](../styles.css), already used at e.g. [styles.css:183](../styles.css)).
   460ms on a frequent hover reads as sluggish.
4. **Keep the right-anchored "type · location" meta on desktop** ([styles.css:1115](../styles.css)) —
   it is recent, fills the row's right side with real content, and is unrelated to the
   preview problem. Untouched.
5. **Footer untouched.** The footer IntersectionObserver that force-retracts the preview
   ([script.js:887](../script.js)) is removed *with* the preview — the footer markup,
   CSS, and behaviour are not edited.
6. **Documentation:** retire the **left-rail preview** term from CONTEXT.md and record
   the flip in a short **ADR 0008** (the preview has now been removed → re-added →
   removed; an ADR stops a third reintroduction). See Documentation.

## Changes

### A. Markup — delete the preview aside (`projects.html`)

Remove the `aside.index__preview` block ([projects.html:37-43](../projects.html)) and its
explanatory comment. The list `<ul id="project-index-list">` and the section stay. Screen
readers lose nothing — the aside was `aria-hidden` and decorative.

### B. CSS — delete the preview + right-anchor; enrich the row in place (`styles.css`)

Delete:
- the whole `.index__preview` base rule ([styles.css:1151-1153](../styles.css)),
- the entire `@media (hover:hover) and (pointer:fine) and (min-width:1100px)` block —
  both the `.index__list` right-anchor margins/max-width and the `.index__preview*`
  rules ([styles.css:1155-1202](../styles.css)),
- the `prefers-reduced-motion` rule that only targeted `.index__preview`
  ([styles.css:1204-1208](../styles.css)).

With the right-anchor gone, `.index__list` keeps its base `margin: 0 auto` centring at
every width (the `min-width:769px` widen to 1100px + meta stays, [styles.css:1091](../styles.css)).

Rework the existing pointer-hover block ([styles.css:1026-1042](../styles.css)) so the
thumbnail enlarges in place and timing tightens:

```css
@media (hover: hover) and (pointer: fine) {
  .index__item::before {
    filter: grayscale(1) brightness(0.78);
    /* transform-only enlarge → no reflow; left/top origin so it grows
       down-and-right from the title's first line (contact-sheet anchor)
       instead of pushing into the row above. */
    transform-origin: left top;
    transition: filter 220ms var(--ease-out), transform 220ms var(--ease-out);
  }
  .index__title {
    transition: transform 220ms var(--ease-out), color 220ms var(--ease-out);
  }
  .index__item:hover::before,
  .index__item:focus-visible::before {
    filter: grayscale(0) brightness(1);
    transform: scale(1.18);
  }
  .index__item:hover,
  .index__item:focus-visible {
    position: relative;   /* lift the enlarged thumb above the next row */
    z-index: 1;
  }
  .index__item:hover .index__title,
  .index__item:focus-visible .index__title {
    transform: translateX(8px);
    color: var(--gold);
  }
}
```

`prefers-reduced-motion` already zeroes the `::before` and `.index__title` transitions
([styles.css:1015](../styles.css), [styles.css:1044](../styles.css)); extend the
`::before` reduced-motion rule to also pin `transform: none` so reduced-motion users get
the **colour** change (comprehension) but **no enlarge** (motion) — Emil's reduced-motion
rule (fewer/gentler, not zero).

### C. JS — delete the preview engine (`script.js`)

Remove the entire desktop left-rail preview block: the `indexPreview` /
`indexPreviewImg` / `indexPreviewMQ` declarations, the footer IntersectionObserver, the
`mouseover` / `mouseleave` handlers, and the `onMQChange` breakpoint guard
([script.js:860-928](../script.js)). Keep the surrounding `if (indexList)` block — the
`--thumb` painting loop ([script.js:850-853](../script.js)) and the click flag for the
mosaic reveal ([script.js:854-858](../script.js)) stay. The new in-place hover is pure
CSS, so no JS replaces what's deleted.

The `indexItems` stagger reference at [script.js:1253](../script.js) is unrelated (it
guards on `indexItems`, defined elsewhere) — confirm it still resolves after the cut; do
not remove it.

### D. Renderer — drop the preview seed if present (`index-render.js`)

ADR 0007 mentions "the first-project seed in `index-render.js`." Current
[index-render.js](../index-render.js) builds rows only and has **no** preview seed —
confirm and leave as-is. (Listed so a reviewer checks rather than assumes.)

## Why not the alternatives (rejected in grilling)

- **Keep the left-rail, just make it track the row + use a bigger source + lower the
  gate.** Rejected — preserves the redundancy (two images per hover) and the two-layout
  cost, and keeps re-introducing the breakpoint fragility. Treats symptoms, not the
  concept.
- **Cursor-following "loose print" (reuse the homepage reel pattern).** Rejected for now
  — more machinery for a frequent hover, and risks feeling gimmicky on a calm index. Not
  forbidden later; it would be a new additive decision.
- **Subtle (colour-only) hover.** Viable and most Emil-pure, but drops the "bigger image"
  payoff the user explicitly valued. The in-place enlarge keeps that payoff cheaply.

## Out of scope / untouched

- **The footer** — markup, CSS, behaviour. (The only footer-touching code, the preview's
  IntersectionObserver, goes away *with* the preview.)
- The **right-anchored meta** line on desktop — kept as-is.
- The **Manifest**, `index-render.js` row markup, the mosaic, and the click→mosaic-reveal
  flag — unchanged.
- Mobile/tablet output — no `:hover` there, so the row-enrich block doesn't apply; those
  widths render exactly as today.

## Verification matrix

Use the static preview server (`.claude/launch.json` → `static`, port 8123). Screenshots
can hang on the animated `.grain` overlay — prefer `preview_eval` measurements + a manual
look.

| Viewport      | What to confirm |
|---------------|-----------------|
| 1440×820 (mouse) | No floating preview anywhere; list is **centred** (`margin-left ≈ margin-right`), not yanked right. Hover a row → its inline thumb enlarges in place + goes colour; title nudges gold. |
| 1280×800 (mouse) | Same single centred layout; hover works. |
| 1093×800 (mouse) | The old gate's blind spot — hover must now work (no 1100px cliff). |
| 768×1024 (touch) | Identical to today: full-colour thumbs, no hover enlarge, no preview node. |
| 375×812 (touch)  | Identical to today. |

For each pointer viewport, confirm:

- [ ] `document.querySelector('.index__preview')` is **null** (markup gone).
- [ ] No console errors (the deleted JS leaves nothing dangling; `indexItems` stagger still runs).
- [ ] Hovered thumbnail enlarges from its **top-left** and lifts above the next row (no clipping by the row below).
- [ ] Hover transition feels crisp (~220ms), not slow.
- [ ] List `margin-left` and `margin-right` are within a few px of each other at ≥1100px (truly centred again).
- [ ] `prefers-reduced-motion`: thumb still goes colour on hover, but does **not** scale; title does not translate.
- [ ] Keyboard: tabbing to a row still shows the focus ring **and** the enlarge/colour (it shares `:focus-visible`).

## Documentation

- **CONTEXT.md** — delete the **"The left-rail preview"** bullet (lines ~44–54). Update
  the **"Inline thumbnail"** bullet to note that on pointer devices the thumbnail
  *enlarges in place* on hover (the contact-sheet reveal), with no separate preview pane.
  No other vocabulary changes.
- **ADR 0008 — "Projects index has no floating preview; the row is the preview."**
  Warranted: the preview pane has now been removed (0007) → re-added → removed again, so a
  future reader will reasonably ask "why not a desktop hover preview?"; it is a real
  trade-off (desktop pointer users get an in-place enlarge instead of a big panel); and
  reversing it means re-adding a whole engine. Supersede the CONTEXT.md "left-rail
  preview" affordance and reference 0007. Keep it short.

## Side note (not part of this change)

CONTEXT.md's "Projects index" entry still describes the right-anchored meta + 1100px
widen as the desktop story; that remains accurate after this change. No drift introduced.
