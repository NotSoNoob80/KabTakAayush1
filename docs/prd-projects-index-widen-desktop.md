# PRD — Widen the Projects index list on desktop with a right-anchored meta line

- Status: Draft
- Date: 2026-06-15
- Related: [plan.md](../plan.md),
  [ADR 0004](adr/0004-data-driven-admin-managed-project-list.md),
  [ADR 0007](adr/0007-projects-index-unified-inline-thumbnail-list.md),
  [CONTEXT.md](../CONTEXT.md)
- Tracker: no issue tracker is currently configured for this repo, so this PRD
  lives as a doc. If a tracker is wired up later, this file is the source to
  paste from; the expected starting state is `ready-for-agent`.

## Problem Statement

A visitor opening the **Projects index** (`projects.html`) on a desktop
monitor sees a single narrow column of project titles stranded in the middle
of a much wider page. Each row is just a number + a big display title + an
inline thumbnail, capped at **760px** and centred — so on a 1440px or wider
screen there are large empty gutters on either side and the page reads as a
stranded mobile view instead of a deliberate desktop layout.

The single-scroll inline-thumbnail list shipped under ADR 0007 is the right
shape for the page, but its width is tuned for phones; on desktop the dead
space undersells what is otherwise the portfolio's primary discovery surface.
Mobile and tablet, by contrast, are already correctly proportioned for their
viewports and should not change.

## Solution

On desktop only (≥769px), **widen the centred reading column to 1100px** and
fill the new horizontal space with a **right-anchored meta line** on every
row — the canonical "type · location" string already authored on each project
in the Manifest (e.g. *"Photowalk · Mumbai"*, *"Photowalk · Sassoon Docks,
Mumbai"*). The row reads **title-left / meta-right**, with the existing
inline thumbnail and number unchanged. Below 769px the page is pixel-identical
to today: same 760px column, no meta, no layout shift.

The meta line is **always rendered into the markup** by the Manifest-driven
renderer and **hidden via CSS** below the desktop breakpoint, so the renderer
stays simple and the static markup is uniform at every width. The widening
respects ADR 0007's commitments: same single unified inline-thumbnail list,
same single page scroll, same pointer-only grayscale→colour thumbnail reveal
as the only hover affordance — no new motion, no preview pane, no wordmark
pivot, no two-column grid.

The cap of **1100px** is the guardrail against ADR 0007's "stranded" failure
mode on ultra-wide monitors: without a cap, a long title at the left edge
and a short meta at the right edge would drift to opposite far edges with a
dead gap between them. 1100px keeps both anchored to a comfortable reading
column even at 4K.

## User Stories

1. As a visitor on a 1440px desktop, I want the Projects index list to fill a
   wider reading column, so that the page reads as a deliberate desktop
   layout rather than a stranded mobile view.
2. As a visitor on a 1920px desktop, I want each project row to show a
   right-anchored "type · location" meta line, so that the new horizontal
   space is filled with real, scannable content rather than dead gutter.
3. As a visitor on a 4K monitor, I want the list to **cap at 1100px**, so
   that the title on the left and the meta on the right don't drift to
   opposite far edges with a dead gap between them.
4. As a visitor on desktop, I want the meta line to read quietly opposite
   the big display title — small, uppercase-tracked, dim — so that it adds
   information without competing with the title for attention.
5. As a visitor on desktop, I want a long meta (e.g. "Photowalk · Sassoon
   Docks, Mumbai" on id 03) to wrap or truncate gracefully on its side of
   the row, so that it never shoves the title or crashes into it.
6. As a visitor on desktop, I want a long title that wraps to 2–3 lines to
   keep the meta anchored to the title's **first line** (top-aligned), so
   that the row matches the contact-sheet anchor the inline thumbnail
   already uses.
7. As a visitor on desktop, I want the meta to be the **same canonical
   "type · location" line** that already appears under the heading on a
   project's own page, so that the two surfaces never drift apart.
8. As a visitor on a phone (≤768px), I want the Projects index to look
   **exactly as it does today** — title only, 760px column, no meta — so
   that nothing changes on the layout that was already correct for my
   screen.
9. As a visitor on a tablet at portrait width (≤768px), I want the same
   pixel-identical mobile behaviour, so that the meta doesn't squeeze in
   at a width where it has no room.
10. As a visitor on a pointer device, I want the **grayscale→colour
    thumbnail reveal on hover** to keep working exactly as it does today,
    so that the brand's contact-sheet hover affordance is preserved.
11. As a visitor with `prefers-reduced-motion`, I want no new motion or
    hover affordances introduced by this change, so that my reduced-motion
    experience is unchanged.
12. As a keyboard user, I want the existing focus ring on the whole row to
    keep working unchanged, so that keyboard navigation of the index is
    not regressed.
13. As a visitor on desktop, I want the bottom rules between rows to frame
    the content **end-to-end across the new wider column**, so that the
    list reads as one deliberate, uniform table rather than a narrow list
    awkwardly stretched.
14. As the site author, I want index rows to keep being **generated from
    the Manifest** by the renderer (no hand-authored `<li>`s in
    `projects.html`), so that ADR 0004's "single source of truth" property
    is preserved.
15. As the site author, I want the renderer to escape the meta string the
    same way it escapes the title, so that no Manifest content can break
    out of the markup.
16. As the site author, I want a project whose Manifest entry is **missing
    `meta`** (or has an empty string) to render an empty meta span rather
    than fall over, so that the renderer stays defensive against partial
    data.
17. As the site author, I want **no new ADR** for this change — only a
    refinement of the existing ADR 0007 in CONTEXT.md — so that the docs
    don't accumulate ceremony for what is a tuning, not a reversal.
18. As the site author, I want `CONTEXT.md`'s **Projects index** entry (and
    the **Inline thumbnail** vocabulary entry) updated to state that on
    desktop each row also shows a right-anchored meta line, so that the
    glossary is no longer "title-only" on desktop.
19. As the site author, I want the desktop widening to live entirely inside
    the existing `@media (min-width: 769px)` block in `styles.css`, so that
    the mobile rules remain visibly the canonical layout and the desktop
    block stays the place to look for desktop tuning.

## Implementation Decisions

- **Two surfaces only.** The change touches the **renderer** and the
  **stylesheet**, plus a documentation update. Specifically: `index-render.js`
  adds a meta span to each row's markup; `styles.css` raises the list cap and
  styles/lays out the meta inside the existing `@media (min-width: 769px)`
  block; `CONTEXT.md` updates the glossary. No new files, no changes to
  `projects.html` markup, no changes to `script.js` (the hover/thumbnail
  engine is untouched), no changes to the Manifest in `projects-data.js`.
- **Renderer adds the meta at all widths.** The renderer emits a
  `.index__meta` span after `.index__title` in the same `<a class="index__item">`
  row template, populated from the project's existing `meta` field and escaped
  with the renderer's `esc()` helper. The span is emitted **at every width**;
  CSS is responsible for hiding it below the desktop breakpoint. This keeps
  the renderer simple and the static markup uniform across viewports.
- **Missing meta is rendered as empty.** If `p.meta` is undefined or empty,
  the renderer emits an empty `.index__meta` span (`esc(p.meta || '')`), not
  nothing — so the row's flex layout is unaffected by partial Manifest data.
- **Widen the cap, don't go full-bleed.** The `.index__list` base rule keeps
  `max-width: 760px`. Inside `@media (min-width: 769px)` the cap is raised to
  `max-width: 1100px`. This is the only width change to the list — no
  full-bleed, no two-column grid, no bigger title type.
- **Right-anchor via flex, not grid.** The row is already a flex container
  with `.index__title { flex: 1 1 auto }`. Adding a sibling with
  `flex: 0 0 auto` and `text-align: right` is sufficient to pin the meta to
  the right edge while the title expands into the remaining space. No grid
  is introduced.
- **Meta visual tone.** Small, uppercase-tracked, dim secondary tone (in the
  family of the existing `--gold-dim` colour used by `.index__num`). It must
  sit quietly opposite the big display title, not compete with it. Exact
  font-size and tracking values are left to the implementer to tune in the
  browser; the requirement is "quiet secondary tone, not a second title".
- **Top-alignment matches the thumbnail.** The row is already
  `align-items: flex-start`, so the meta anchors to the title's first line
  when a long title wraps to 2–3 lines — matching the inline thumbnail's
  contact-sheet anchor. No new alignment rule needed.
- **Long-meta containment.** `.index__meta` gets a sensible `max-width` and
  controlled wrapping (`white-space` / `overflow-wrap`) so a long meta wraps
  tidily on its side or truncates with ellipsis rather than crushing the
  title's flex space. The exact strategy (wrap vs. truncate) is chosen in
  the browser against the longest real Manifest meta strings, with id 03
  (`"Photowalk · Sassoon Docks, Mumbai"`) as the binding case.
- **Hide-below-desktop is the base rule.** `.index__meta { display: none; }`
  in the base stylesheet, switched to `display: block` (or `display: flex`,
  if alignment requires it) inside `@media (min-width: 769px)`. Mobile and
  tablet are guaranteed pixel-identical to today by this single rule.
- **Breakpoint stays 769px.** The widening uses the **same** desktop
  breakpoint that already governs the existing desktop tuning of the index
  (gap, padding, thumbnail size). One breakpoint, one source of truth for
  "desktop index".
- **Bottom rules still frame the column.** The existing
  `border-bottom: 1px solid var(--line)` on each `<li>` (and the
  `border-top` on the first child) naturally stretch to the new wider cap;
  no rule change is required for the dividers to frame the wider column
  end-to-end.
- **No motion, no new hover affordance.** The grayscale→colour thumbnail
  reveal stays the only hover affordance on the row. The meta does not
  animate, fade, or react to hover.
- **Docs: CONTEXT.md only, no new ADR.** This refines ADR 0007 (keeps its
  unified centred column, single scroll, and pointer-only grayscale reveal)
  without reversing it; a full ADR is not earned. CONTEXT.md must change
  because the **Projects index** entry currently describes a title-only
  row, which is no longer accurate on desktop. The amendment notes the
  desktop right-anchored meta line as a **refinement** of ADR 0007, not a
  reversal.

## Testing Decisions

This is a static HTML/CSS/JS site with no test runner; the only meaningful
seam is **the rendered page at the target viewport widths, in a real
browser** (Chrome DevTools device emulation, or the dev preview at the same
widths). A good test asserts what the visitor sees — width, anchoring,
wrap behaviour, identical mobile — not which CSS selectors are present.

- **Verification seam: a real browser at the target widths.** Same approach
  used by [prd-about-aspect-ratio-fix](prd-about-aspect-ratio-fix.md) and
  [prd-about-phone-fit](prd-about-phone-fit.md): render the page at a
  matrix of widths and assert observed behaviour.
- **Target widths (the matrix this PRD is built around):**
  - **360 px** — common older Android (mobile no-regression check)
  - **411 px** — Nothing Phone 2a (mobile no-regression check)
  - **768 px** — the **boundary just below** the desktop breakpoint — must
    look exactly like the smaller mobile widths
  - **769 px** — the **boundary just at** the desktop breakpoint — meta
    appears, list cap raises to 1100px
  - **1280 px** — typical desktop monitor
  - **1440 px** — common designer monitor
  - **1920 px** — full HD desktop
  - **2560 px / 4K** — the cap-stress case (1100px guardrail must hold)
- **Per-width checks:**
  - At **<769px**: page is pixel-identical to today — `.index__list`
    `max-width` is 760px, no meta is visible, no layout shift versus
    `main` branch.
  - At **≥769px**: `.index__list` fills toward 1100px; every row reads
    title-left / meta-right; bottom rules frame end-to-end across the
    wider column.
  - At **≥769px** on id **03** (long meta — *"Photowalk · Sassoon Docks,
    Mumbai"*): meta wraps or truncates tidily on its side without
    crushing the title.
  - At **≥769px** on the **longest title** that wraps to 2–3 lines: meta
    stays anchored to the title's first line (top-aligned).
  - At **2560 px**: the title and meta do not drift to opposite far edges
    — they stay within the 1100px column.
- **Mobile no-regression:** at 360 px and 411 px the page is byte-equivalent
  to today (no meta in the DOM is visible, no layout shift, no width
  change).
- **Hover affordance check (pointer):** the grayscale→colour thumbnail
  reveal still works on hover; no new hover affordance is introduced by
  the meta.
- **Manifest-driven check:** every row in the rendered list corresponds to a
  Manifest entry, and on desktop every row's meta matches the
  Manifest's `meta` field for that project. No hand-authored `<li>`s in
  `projects.html` (preserves ADR 0004).
- **Reduced motion:** with `prefers-reduced-motion` enabled, behaviour is
  unchanged versus today.
- **Keyboard focus:** tabbing through the rows still shows the
  whole-row focus ring; the meta does not steal focus.
- **Prior art:** the verification pattern (browser at a width matrix, no
  test framework introduced) matches
  [prd-about-aspect-ratio-fix](prd-about-aspect-ratio-fix.md) and
  [prd-about-phone-fit](prd-about-phone-fit.md). A test framework is
  **not** introduced as part of this PRD.

## Out of Scope

- **Mobile / tablet layout (<769px)** — pixel-identical to today; not
  touched. No meta is shown below the desktop breakpoint.
- **The Void** (`index.html`), the **Mosaic** (`project.html`), and the
  **Listing** (`about.html`) — not part of this PRD.
- **2-column row grid, full-bleed, bigger title type, or new hover
  affordances** — explicitly excluded; this is a widening + a single new
  right-anchored secondary element, nothing more.
- **Changes to the Manifest schema** — the `meta` field already exists on
  every project; no new field is added.
- **A new ADR** — this refines ADR 0007, it does not reverse it. The
  refinement is captured in CONTEXT.md only.
- **The renderer's path/escape helpers, the hover engine in `script.js`,
  the focus ring, and the inline thumbnail's grayscale→colour reveal** —
  all untouched.
- **Introducing a test framework or CI** — not done here.
- **Bringing back any retired ADR 0006 machinery** (preview pane,
  hover-swap engine, more-below cue, wordmark pivot, pinned tableau) —
  explicitly out of scope. ADR 0007 is refined, not reversed.

## Further Notes

- **Why 1100px specifically.** Wide enough that a 1440px or 1920px monitor
  reads as a deliberate desktop layout with real content on both sides of
  the row, narrow enough that on a 4K monitor the title and meta stay
  within a comfortable reading column instead of stranding at the far
  edges with a dead gap between them (the ADR 0007 failure mode).
- **Why hide via CSS, not skip in the renderer.** Emitting the meta span
  at every width keeps the renderer one code path and the static markup
  uniform — a developer inspecting the rendered HTML on a phone sees the
  same row shape as on desktop, just with the meta hidden. It also lets
  any future small-screen tuning (e.g. showing the meta on tablet) be a
  pure CSS change rather than a renderer change.
- **Why no new ADR.** ADR 0007's load-bearing commitments — one unified
  inline-thumbnail list at every width, single page scroll, pointer-only
  grayscale reveal as the only hover affordance, no preview pane, no
  wordmark pivot, no internal scroll — are all preserved. The change is a
  width tune + a quiet secondary element on the same row, not an
  architectural trade-off with genuine alternatives. CONTEXT.md is the
  right surface to record the refinement.
- **Why the meta is the canonical "type · location" line.** It is the
  same string already shown under the heading on a project's own page, so
  the index and the Mosaic stay consistent in vocabulary — a visitor sees
  the same identifier for a project on both surfaces.
- No issue tracker is configured for this repo. If one is added later,
  this PRD is the source to paste from; a `ready-for-agent` triage label
  is the expected starting state.
