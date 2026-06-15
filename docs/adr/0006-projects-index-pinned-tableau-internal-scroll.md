# 0006 — Projects index keeps a pinned one-screen tableau with an internally-scrolling list on desktop

- Status: Accepted
- Date: 2026-06-15

## Context

On desktop the Projects index (`projects.html`) is a fixed one-screen tableau:
`.index` is `height: calc(100vh - var(--nav-h)); overflow: hidden`, the title list
(`.index__list`) scrolls *inside its own column* (`overflow-y: auto;
overscroll-behavior: contain`), and the footer sits in normal flow below the pane —
so the page itself is also scrollable.

This creates two scroll contexts. A wheel over the list scrolls the list (and
`overscroll-behavior: contain` stops it leaking to the page); a wheel off the list
(the right-hand preview side) scrolls the page to the footer.

When the list grew from five titles to twelve, the bottom titles fell below the fold
of the *internal* scroll. A visitor who scrolled the **page** saw the footer rise and
read the last visible title as the end of the list — the lower projects looked
"hidden by the footer" (see
[plan](../projects-desktop-list-visibility-plan.md)). The obvious alternative was to
abandon the pinned pane on desktop and let the whole page scroll naturally, exactly
like the compact/phone layout does (`height: auto; overflow: visible`).

## Decision

Keep the desktop pinned one-screen tableau with the internally-scrolling list. Do
**not** switch desktop to the phone-style natural page scroll. Address the
discoverability gap instead with a persistent **more-below cue** (a gold
down-chevron + project count, shown while the list has un-scrolled titles), and keep
the existing cursor-routed scrolling: list scrolls when hovered, page scrolls to the
footer when the cursor is off the list.

## Consequences

- The signature desktop composition is preserved — a still, single-screen pane with
  the list as the one moving element and the hover-driven preview pane fixed beside
  it. This is the look the desktop layout exists to deliver.
- Two scroll contexts remain by design. They are reconciled by
  `overscroll-behavior: contain` (wheel-over-list never chains to the page) plus the
  more-below cue (so the internal overflow is discoverable). Both must stay: removing
  the cue brings the "hidden by the footer" perception straight back.
- The desktop and compact layouts now diverge in scroll model on purpose — compact
  flows the whole page (its 46vh list is an obviously-bounded box), desktop pins. A
  future change to one must not assume the other shares its scroll behaviour.
- We accept that reaching the footer on desktop requires moving the cursor off the
  list. That is intentional, not a bug.
- If the day comes that the list is far too long for an internal scroll to feel good,
  revisit this — the natural-page-scroll alternative is the fallback we deliberately
  deferred here, not one we ruled out forever.
