# 0005 — A project can pin its exact photo/video order

- Status: Accepted
- Date: 2026-06-15

## Context

The Mosaic's tile order is decided by `projectMedia`. Photos render in their
file-number order (`01.webp`, `02.webp`, …), and videos used to be **woven in
algorithmically** — spaced evenly among the photos — regardless of where they
sat when uploaded. That was fine when nobody cared about exact placement, but
the Admin now offers drag-to-reorder, and a creator dragging a video to sit
between two specific photos expects it to land there.

## Decision

A project entry may carry an explicit **`media` order**: a compact string of
`'i'` (next image) and `'v'` (next video) characters, in the exact sequence the
tiles should appear — e.g. `'iivii v'` means image, image, video, image, image,
video. The Admin generates it from the gallery card order; `projectMedia` walks
it tile-for-tile, pulling the next image or video as it goes.

The field is **optional and only emitted when a project has videos**. Projects
without it — including all photo-only projects and the 11 legacy projects —
keep the old behaviour: photos in order, videos woven in evenly.

## Consequences

- Drag order in the Admin (photos *and* videos interleaved) now sticks on the
  live site.
- The `media` string is cryptic on its own — this record and the comment on
  `projectMedia` are why `'iiv…'` appears in the Manifest.
- Files are still numbered per-kind (`images/01.webp…`, `videos/01.mp4…`); only
  the *render order* is captured by `media`. The string's `i`/`v` counts must
  match `imageCount`/`videoCount`; `projectMedia` appends any leftovers
  defensively if they ever drift, so a stale string degrades rather than breaks.
- Legacy projects are untouched — no migration, no `media` field, same output.
