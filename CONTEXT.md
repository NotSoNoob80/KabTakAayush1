# Context — KabTakAayush

A glossary of the vocabulary this portfolio site uses. Terms here describe
*what things are*, not how they're built. Code is the source of truth for
implementation; this file is the source of truth for what we call things.

## Pages & their nicknames

- **The Void** — the homepage (`index.html`). A WebGL field of floating
  photo **frames** the visitor flies through. Has no normal page chrome of
  its own; it is its own self-contained experience.
- **The Projects index** (or just **the index**) — `projects.html`. The
  scrollable list of project **titles**. On large screens it is flanked by
  the **wordmark pivot** and the **preview pane**; on small screens each row
  carries its own **inline thumbnail** instead.
- **The Mosaic** — a single project's page (`project.html`). An editorial
  collage grid of that project's images.
- **The Listing** — the about page (`about.html`). A scroll-pinned
  "classifieds" sequence — *Roti, Kapda, Makaan… and Art* — where scroll
  position scrubs four **cards** through their states.

## Things on the screen

- **Frame** — one floating photo in the Void. (Not to be confused with a
  Listing card's paper edge.)
- **Wordmark** — the big "KabTakAayush" lettering. The decorative one in the
  page footer is **the footer wordmark**; the small centred one between the
  index columns is **the wordmark pivot**.
- **Preview pane** — the large hover-driven image on the right of the
  Projects index that swaps to match the hovered title. A *hover* affordance:
  it only exists where a pointer can hover.
- **Inline thumbnail** — the small image shown *beside each title* on the
  Projects index on small screens, replacing the Preview pane.
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
  the touch counterpart to the desktop per-letter hover press. A
  horizontal-only gesture — vertical drags still scroll the page. Under
  `prefers-reduced-motion` it does not run (the long-press callout is still
  suppressed; that is a fix, not motion).
- **Focus** (Void) — clicking/tapping a frame so it glides front-and-centre.
- **Beat** (Listing) — a resting point in the scrub the page can snap to.
- **Listing on a small screen** — the Listing *keeps* the scrub on phones; it
  is not swapped for the stacked reduced-motion fallback. To make a card fit a
  phone-height frame it shrinks the stage and shows the **trimmed status**
  instead of the full paragraph. Only `prefers-reduced-motion` gets the static
  stacked layout.
