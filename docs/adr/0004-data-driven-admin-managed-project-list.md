# 0004 — The project list is data-driven and admin-managed

- Status: Accepted
- Date: 2026-06-15

## Context

A project used to live in **two** hand-edited places that had to be kept in
sync: the `PROJECTS` array in `projects-data.js` (the **Manifest**, read by the
Mosaic) and a duplicate block of `<li>` rows hardcoded in `projects.html` (read
by the Projects index). Adding a project meant pasting into both files by hand,
in the right spot, with the right escaping — and getting the thumbnail path,
meta line, and reveal-delay to match across the two.

`admin.html` softened this only slightly: it produced copy-paste *snippets* for
each file. The duplication — and the chance to mis-paste — remained. Worse, the
two sides had already **drifted**: the Admin emitted `.jpg` paths and files
while the rest of the site read `.webp`, so a project added through the Admin
rendered a broken Mosaic.

The site is served over http only (Vercel, or a local dev server) — never
opened from `file://`. That removes the constraint that previously justified
fully static, pre-rendered HTML.

## Decision

Make the Manifest the **single source of truth** and let the Admin write to it
directly.

- `projects.html` no longer ships hardcoded `<li>` rows. The Projects index is
  **rendered from the Manifest** at load (rows, reveal delays, the initial
  active row, and the preview seed), after which `script.js` wires up hover /
  preview / touch behaviour exactly as before.
- The `PROJECTS` array in `projects-data.js` is wrapped in marker comments. The
  Admin loads the live Manifest, appends the new project, splices the
  regenerated array between those markers, and ships the **whole updated
  `projects-data.js` inside the ZIP**. The homepage reel count in `index.html`
  is handled the same way (a marker around `REEL_COUNT`).
- Installing a project or reel batch is now: **extract the ZIP at the repo root,
  commit, push.** No file is edited by hand.

## Consequences

- One source of truth. The index and the Mosaic can no longer disagree, and the
  `.jpg`/`.webp` drift class of bug is gone (the Admin is the only writer, and
  it writes WebP — see [CONTEXT.md](../../CONTEXT.md)).
- `projects.html` is intentionally "incomplete" on its own: its `<ul>` is empty
  in source and filled by JS. A reader expecting static rows will be surprised;
  this record is why. The trade-off is accepted because the alternative was
  permanent two-file duplication.
- The pages depend on http (the Admin fetches the Manifest/`index.html` text to
  splice; the index renders client-side). Opening them from `file://` would
  break — acceptable, because the site is Vercel-only by design.
- The Admin now carries marker contracts: the marker comments in
  `projects-data.js` and around `REEL_COUNT` in `index.html` are load-bearing.
  Renaming or removing them breaks the Admin's splice.
