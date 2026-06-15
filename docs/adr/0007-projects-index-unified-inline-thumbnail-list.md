# 0007 — Projects index is one unified inline-thumbnail list at every width

- Status: Accepted
- Date: 2026-06-15
- Supersedes: [ADR 0006](0006-projects-index-pinned-tableau-internal-scroll.md)

## Context

ADR 0006 (accepted earlier the same day) committed the Projects index to two
distinct layouts: a desktop **pinned one-screen tableau** — a three-column grid
of list ⏐ wordmark pivot ⏐ hover-driven **preview pane**, with the title list
scrolling *internally* — and a small-screen **inline-thumbnail** list that flows
the whole page with a thumbnail beside each title. It explicitly rejected
"switch desktop to the phone-style natural page scroll," and to make the
internal-scroll model discoverable it added the **more-below cue** (a gold
chevron + project count).

In practice the desktop model kept generating friction that the inline list does
not have:

- **Two scroll contexts.** A wheel over the list scrolled the list; a wheel off
  it scrolled the page to the footer. The more-below cue existed *only* to paper
  over the resulting "footer hides the lower projects" confusion — a fix for a
  problem the single-scroll mobile layout never has.
- **The preview pane is hover-only.** It delivered nothing on the growing share
  of pointer-less / hybrid devices, and it is the reason the desktop layout
  needed all the swap/fade machinery in the first place.
- **The mobile inline list is simply the stronger page.** A photographer's
  contact sheet of thumbnail-beside-title rows reads clearly, scrolls once, and
  works identically for every input device.

ADR 0006 itself left the door open: *"If the day comes that the list is far too
long for an internal scroll to feel good, revisit this — the
natural-page-scroll alternative is the fallback we deliberately deferred here."*
That day came immediately.

## Decision

Serve the **inline-thumbnail list at every width**. Delete the desktop-only
machinery:

- the **preview pane** (markup, CSS, and the first-project seed in
  `index-render.js`),
- the **hover-swap engine** (the image fade / frame-translate branch in
  `script.js`),
- the **more-below cue** (markup, CSS, JS, and its CONTEXT.md entry),
- the **wordmark pivot** (already absent from markup; now also retired from the
  vocabulary), and
- the unreachable **pinned / internal-scroll / grid** CSS for `.index`.

The inline list is no longer gated behind a `(hover:none), (pointer:coarse),
(max-width:768px)` query — it becomes the base, unconditional layout. On wide
screens it sits in a **centred max-width column** with the thumbnail and title
scaled up a notch, so it reads as a deliberate page rather than a stranded
mobile view. The one hover affordance kept is pointer-only
(`@media (hover:hover)`): a row's thumbnail drops its grayscale to full colour,
reusing the Mosaic's existing contact-sheet reveal. No preview pane, no cue
text, no layout shift on hover.

## Consequences

- One layout, one scroll context, one code path. The `indexInlineThumbs` branch
  in `script.js` becomes the only branch; the page is materially simpler.
- The signature desktop composition from ADR 0006 — the still single-screen
  pane with a fixed hover preview — is **gone on purpose**. That look is no
  longer something the codebase delivers or aspires to.
- The more-below cue shipped earlier today is **retired**, not merely hidden.
  Its whole reason for existing (internal-scroll discoverability) disappears
  with the pinned pane.
- **The preview pane is deferred, not forbidden.** If a richer desktop-only
  hover preview is ever wanted again, it would be a new, additive decision —
  this ADR removes it as dead weight, it does not rule the idea out forever.
- Desktop pointer users get *less* feedback than the old hover preview gave
  (one grayscale→colour swap instead of a swapping preview image). This is an
  accepted, deliberate trade for a single coherent layout.

## Side cleanup folded in

ADR 0006's plan flagged pre-existing doc/markup drift: CONTEXT.md described a
**wordmark pivot** the markup no longer contained. This ADR resolves that drift
by retiring the pivot from the vocabulary rather than restoring it.
