# 0008 — Projects index has no floating preview; the row is the preview

- Status: Accepted
- Date: 2026-06-16
- Supersedes the **left-rail preview** affordance recorded in CONTEXT.md
- Re-affirms: [ADR 0007](0007-projects-index-unified-inline-thumbnail-list.md)

## Context

[ADR 0007](0007-projects-index-unified-inline-thumbnail-list.md) deleted the
desktop preview pane as "dead weight" and committed the Projects index to one
inline-thumbnail list at every width. It also left the door open: *"The preview
pane is deferred, not forbidden."*

A left-rail preview was later re-added behind a `(hover:hover) and
(pointer:fine) and (min-width:1100px)` gate, sitting fixed at the left edge of
the viewport and swapping in the hovered row's image at a larger size. Reviewed
live, it kept generating the friction 0007 had already diagnosed:

- **Spatially disconnected** — the preview sat fixed at viewport-left, vertically
  centred, and never tracked the hovered row. The hover happened on the right;
  the response appeared on the left.
- **Redundant** — each row already owns an inline thumbnail that drops
  grayscale→colour on hover. The preview showed the same photo, bigger,
  somewhere else: two copies of one image for one hover.
- **Two desktop layouts with a fragile breakpoint** — below 1100px the list was
  centred; at ≥1100px the whole list was yanked ~400px right to reserve the
  preview's column. A 1366×768 laptop at 125% display scaling reports ~1093 CSS
  px — *just under* the gate — so the most common Windows laptop never saw the
  preview at all.
- **Over-animated for its frequency** — row hover is a tens-of-times-per-session
  interaction. A 360–480ms image fly-in from the far edge is the opposite of
  what that frequency wants.

## Decision

Remove the left-rail preview entirely — markup, CSS, JS, and the ≥1100px
right-anchor layout it forced. Restore the **one centred-column layout at every
width** that 0007 committed to.

**The row IS the preview.** On a pointer device, hovering a row enlarges its
inline thumbnail in place (~1.18× from its top-left, transform-only so the row
doesn't reflow) while it blooms grayscale→colour; the title keeps its quiet
nudge + gold tint. Hover transitions tighten to **~220ms `var(--ease-out)`** —
the project's standard interaction curve — instead of the previous 460ms.

`prefers-reduced-motion` keeps the colour bloom (comprehension) but pins
`transform: none` so the enlarge is suppressed (motion).

## Consequences

- One layout, one scroll context, one code path — re-aligned with 0007.
- The 1100px breakpoint cliff is gone; the affordance now works identically at
  1093px, 1280px, and 1440px.
- Desktop pointer users get an in-place enlarge instead of a separate preview
  panel. The "bigger image on hover" payoff is preserved; the spatial
  disconnect and the redundancy are not.
- The footer IntersectionObserver that force-retracted the fixed preview is
  removed *with* the preview. The footer itself is untouched.
- **A floating desktop preview is now closed off, not just deferred.** The
  pattern has been removed (0007) → re-added → removed again; a future
  reintroduction should expect to argue against this ADR. The cursor-following
  "loose print" used on the homepage reel remains a different pattern available
  for different surfaces — that is not what this ADR forbids.
