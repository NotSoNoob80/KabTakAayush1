# Context — KabTakAayush

A glossary of the vocabulary this portfolio site uses. Terms here describe
*what things are*, not how they're built. Code is the source of truth for
implementation; this file is the source of truth for what we call things.

## Pages & their nicknames

- **The Void** — the homepage (`index.html`). A WebGL field of floating
  photo **frames** the visitor flies through. Has no normal page chrome of
  its own; it is its own self-contained experience.
- **The Projects index** (or just **the index**) — `projects.html`. A single,
  centred, full-page-scrolling list of project **titles**, each row carrying its
  own **inline thumbnail**. The *same* layout at every width — no separate
  desktop tableau. On desktop (≥769px) each row also shows a right-anchored
  **"type · location" meta line** (the same canonical string already shown
  under the heading on a project's own page), and the reading column widens
  to 1100px so the wider monitor reads as a deliberate desktop layout rather
  than a stranded mobile view; below 769px the row is title-only as before.
  This is a refinement of
  [ADR 0007](docs/adr/0007-projects-index-unified-inline-thumbnail-list.md),
  not a reversal — unified single list, single page scroll, and pointer-only
  grayscale reveal are all preserved. The column is *not quite* centred: it
  carries a small, **bounded rightward bias** that grows with the viewport
  (zero on phones, a measured nudge on wide screens) so the enlarged inline
  thumbnail does not leave each row reading left-heavy — see
  [ADR 0009](docs/adr/0009-projects-index-bounded-rightward-bias.md).
- **The Mosaic** — a single project's page (`project.html`). An editorial
  collage grid of that project's images.
- **The Listing** — the about page (`about.html`). A scroll-pinned
  "classifieds" sequence — *Roti, Kapda, Makaan… and Art* — where scroll
  position scrubs four **cards** through their states.

## Things on the screen

- **Frame** — one floating photo in the Void. (Not to be confused with a
  Listing card's paper edge.)
- **Wordmark** — the big "KabTakAayush" lettering. The decorative one in the
  page footer is **the footer wordmark**. (There was once a **wordmark pivot**
  centred between the old index columns; the unified index has no columns, so
  the pivot is retired — see
  [ADR 0007](docs/adr/0007-projects-index-unified-inline-thumbnail-list.md).)
- **Inline thumbnail** — the image shown *beside each title* on every row of
  the Projects index, at every width. On pointer devices, hovering a row
  blooms its thumbnail *in place* from grayscale to full colour (the row IS
  the preview — no separate preview pane) — the brand's "contact-sheet"
  reveal, shared with the Mosaic. See
  [ADR 0008](docs/adr/0008-projects-index-row-is-the-preview.md). The thumbnail
  no longer also *enlarges* on hover: once it became large and responsive that
  size jump spilled over the title and the next row, so it was dropped — see
  [ADR 0009](docs/adr/0009-projects-index-bounded-rightward-bias.md). The
  desktop-only **"type · location" meta line** opposite the title does not
  animate or react to hover.
- **Frame number** — the small project number (`01`–`12`) at the left edge of
  each Projects index row, set in the display face and stacked so the numbers
  line up like the frame numbers running down a strip of film.
- **Film marker** — the play glyph shown on the **inline thumbnail** of a row
  whose project is a *film* (rather than a photo series), so a film reads as
  motion at a glance at every width — including phones, where the
  "type · location" meta line is hidden.
- **Card** — one classifieds clipping in the Listing (Roti / Kapda / Makaan /
  Art). Each card has a faint line-art **illustration** in its corner.
- **Status** — the body line beneath a card's price (its "ad copy"). On small
  screens each card shows a **trimmed status** — a short one-line variant — in
  place of the full desktop paragraph, so the card fits a phone-height frame.

## Behavioural vocabulary

- **Small screen** — a screen we serve the compact layout to. Defined by
  *either* an unusable hover (touch / coarse pointer) *or* a narrow viewport
  (≤768px). See [ADR 0001](docs/adr/0001-responsive-switches-on-width-not-pointer.md).
- **Glissando** (footer wordmark) — on touch devices, sliding a finger
  across the footer wordmark "plays" each letter it crosses like a piano key:
  the touch counterpart to the desktop per-letter hover press. Hold-and-
  release: a letter presses down and *stays* down while the finger rests on
  it, then springs back the instant the finger leaves it or lifts — so a tap
  holds for as long as you hold. Its neighbours dip shallowly 40ms later
  (a transient ripple, not held) so the press cascades, and supporting devices
  give one short haptic tick per press. Driven by the Web Animations API
  (interruptible — the spring-back can start from a still-pressing key)
  rather than a toggled CSS class. A horizontal-only gesture — vertical drags
  still scroll the page. Under `prefers-reduced-motion` it does not run (the
  long-press callout is still suppressed; that is a fix, not motion).
- **Focus** (Void) — clicking/tapping a frame so it glides front-and-centre.
- **Beat** (Listing) — a resting point in the scrub the page can snap to.
- **Listing on a small screen** — the Listing *keeps* the scrub on phones; it
  is not swapped for the stacked reduced-motion fallback. To make a card fit a
  phone-height frame it shrinks the stage and shows the **trimmed status**
  instead of the full paragraph. Only `prefers-reduced-motion` gets the static
  stacked layout.

## Authoring & assets

- **The Manifest** — the canonical list of projects (the `PROJECTS` data in
  `projects-data.js`). For each project it records its **title**, its **meta**
  line (the "type · location" line shown under the heading), its type, a
  **description**, and how many images/videos it holds. The Manifest is the
  single source of truth: both the Projects index *and* a project's Mosaic are
  built from it. The index rows are **generated** from the Manifest, not
  hand-written. See [ADR 0004](docs/adr/0004-data-driven-admin-managed-project-list.md).
- **Description** — a project's longer blurb in the Manifest. It is *not* shown
  in the project page's visible copy (that stays "heading + location only");
  it feeds the page's `<meta name="description">` for search engines.
- **Media order** — the exact sequence a project's photos and videos appear in
  the Mosaic, set by dragging cards in the Admin. Stored as the Manifest's
  `media` string (`i` = photo, `v` = video). Without it, videos are woven in
  evenly instead. See [ADR 0005](docs/adr/0005-explicit-media-order.md).
- **The Admin** — the private authoring tool (`admin.html`). It prepares a new
  project or a homepage **reel** batch: it re-encodes the photos to **WebP**,
  bundles them into a **ZIP**, and updates the Manifest (and the reel count)
  for you — there is no copy-paste-into-files step.
- **WebP convention** — every project and reel *photo* is stored as WebP
  (`thumbnail.webp`, `01.webp`, …). Only **videos** keep their original MP4
  files. The Admin enforces this on the way in.
