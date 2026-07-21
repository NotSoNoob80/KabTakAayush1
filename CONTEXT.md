# Context — KabTakAayush

A glossary of the vocabulary this portfolio site uses. Terms here describe
*what things are*, not how they're built. Code is the source of truth for
implementation; this file is the source of truth for what we call things.

## Pages & their nicknames

- **The Void** — the homepage (`index.html`). A WebGL field of floating
  photo **frames** the visitor flies through. The site nav stays visible over
  it behind a soft scrim (the old desktop "peek when the pointer nears the
  top" behaviour is retired); everything below the nav is its own
  self-contained experience. The Void renders in both **themes** — black
  space in dark, paper-white space in light.
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

- **The reticle** — the on-canvas joystick knob shown *only while The Reach is
  active*. A subtle gold ring at the screen centre that represents the hand's
  offset from the **rest zone**; brightens as the hand pushes outward, morphs
  into a palm or fist silhouette to mirror the visitor's gesture, and gains
  **the clutch ring** while depth is pinned. There is deliberately
  **no on-screen camera preview** — the reticle plus the **camera-active
  indicator** are the only feedback channels.
- **Camera-active indicator** — a small persistent red dot + "Camera on"
  label, shown for as long as The Reach is streaming. Non-decorative — its
  job is privacy honesty in the absence of a self-view.
- **The clutch ring** — a thin concentric outer ring around **the reticle**,
  in the same gold, shown *only while the Void is depth-clutched*. Composes
  additively with the reticle's `is-pushing` brightening: the centre dot
  keeps tracking pan offset while the ring is held, which is exactly the
  mental model. No text label, no colour shift on the reticle's centre — the
  reticle plus this ring plus the camera-active indicator are the only
  feedback channels The Reach exposes.

- **The Cover** — the brief full-bleed image shown on a project's page *during
  entrance only*, while the **inline thumbnail** the visitor clicked on the
  Projects index morphs open into it. It carries the same image as that row's
  thumbnail (`thumbnail.webp`), then dissolves as the **Mosaic** settles
  underneath. Purely an entrance surface — it has no resting form and is gone
  once the project is open. The same morph plays in reverse on the way back
  (browser back *or* the floating "Back to Projects" button). A pointer/keyboard
  navigation thing, not a thing you can point at while reading a project. The
  site stays multi-page (not an SPA shell) so this transition stays
  cross-document.

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
- **The Reach** (Void) — an opt-in, additive control layer that lets the
  visitor steer the Void with their bare hand, seen by the device's front
  camera. An open palm becomes a joystick: its offset from the **rest zone**
  pans `camTarget.x` / `camTarget.y`, and its apparent size flies
  `camTarget.z`. Closing into a fist engages **the clutch**, which pins depth
  so the visitor can pan around at a committed depth. The Reach has no
  frame-selection gesture of its own — **Focus** stays a mouse click or a
  touch tap. Enabled only by pressing the
  on-canvas "The Reach" CTA — no auto-enable, no hotkey, no
  URL parameter. Off by default; not advertised under
  `prefers-reduced-motion`. Hand tracking runs entirely on-device (MediaPipe
  Tasks Vision `HandLandmarker`, lazy-loaded only when the visitor opts in)
  and writes into the same `camTarget` channels every existing input already
  mutates — see
  [ADR 0010](docs/adr/0010-the-reach-additive-camtarget-writer.md).
- **Rest zone** (Void) — the neutral dead-zone at the centre of the camera
  frame inside The Reach. Hand inside it ⇒ no motion (Void coasts on its
  existing inertia); hand outside it ⇒ drift in that direction at a speed
  proportional to the offset.
- **The clutch** (Void) — the closed-fist gesture inside The Reach: thumb
  folded across curled fingers 2–5. Holding it puts the Void into
  **depth-clutched** — `camTarget.z` no longer responds to apparent hand
  size — while pan continues exactly as in the open-palm steer. Releasing
  the hand back to a palm resumes depth steering without a jerk forward or
  backward, because the open-palm size anchor is re-anchored on the release
  frame — see [ADR 0011](docs/adr/0011-the-reach-clutch-calib-size-reanchor.md).
  The discriminator is the openness of fingers 3–5: an open palm extends them,
  the clutch curls them.
- **Depth-clutched** (Void) — the state the Void is in while a visitor holds
  **the clutch**: `camTarget.z` does not integrate new hand input, but pan
  continues to write `camTarget.x` / `camTarget.y` exactly as in the
  open-palm steer. The clutch is The Reach's internal state, not a global
  mode — mouse, wheel, touch, and Focus are untouched. The seam established
  by [ADR 0010](docs/adr/0010-the-reach-additive-camtarget-writer.md) is
  preserved — the clutch only changes *when* The Reach writes to
  `camTarget.z`, not where.
- **The living Mosaic** — the umbrella for the Mosaic's three "alive-on-scroll"
  reactions: **Frame drift**, **Tile settle**, and **Gate shear**. They make the
  Mosaic feel like a place you move through rather than a static page. All three
  are transform/opacity-only, share one rAF writer that sleeps when nothing is
  moving, and are off under `prefers-reduced-motion`.
- **Frame drift** (Mosaic) — the depth reaction: each photo drifts *inside* its
  fixed **frame** (the frame never moves, so the grid never opens seams). The
  image is slightly overscanned and shifts toward the cursor on desktop, or with
  scroll position on mobile, by a small deterministic per-tile amount — so the
  collage reads as varied depth, like photos behind glass you lean to look
  around.
- **Tile settle** (Mosaic) — the arrival reaction: a tile scales 1.04→1 as it
  scrolls into view. Once-per-tile (it never re-animates on reverse scroll),
  reusing the from-index intro's exact easing. The from-index intro now animates
  only the first screen and hands every below-fold tile to this settle.
- **Gate shear** (Mosaic) — the momentum reaction: the whole grid shears
  sub-degree with scroll velocity (a film *gate* nod) and decays back to flat at
  rest. The quietest of the three, kept almost subliminal.
- **The Spotlight** (Mosaic, *film-only*) — how a **film-only** project's Mosaic
  behaves: the single vertical column of videos becomes a curated reel in which
  exactly one video — **the lit film** — is "on" at a time. As the visitor
  scrolls, the lit film hands off down the column. Applies *only* to film-only
  projects (all video, no photos — the `mosaic__grid--film` stack); a *mixed*
  photo+video Mosaic is unchanged and still plays every visible video. The same
  on every device. See
  [ADR 0013](docs/adr/0013-film-only-mosaic-is-a-spotlight.md).
- **The lit film** (Spotlight) — the one video currently "on": its **mount**
  thickens and warms to full gold, it rises a few pixels, and it is the only
  video playing — and the only one that can carry sound. Every other video rests
  dimmed and paused. Chosen by **the sightline**. On a fresh load the topmost
  video (nearest the sightline) is the lit film.
- **The mount** (Spotlight) — the gold edge around each video in a Spotlight: a
  faint dim-gold hairline at rest, thickening and brightening to full `--gold` on
  **the lit film**. The brand's "now playing" mark for film. *Not* a thick mat —
  the video stays full-bleed; only the edge changes (an earlier "shrink the video
  25 % to reveal a mat" idea was dropped, see
  [ADR 0013](docs/adr/0013-film-only-mosaic-is-a-spotlight.md)).
- **The sightline** (Spotlight) — the invisible line across the viewport's
  vertical centre that decides which video is **the lit film**: whichever video's
  centre sits nearest it. It has no visible form of its own — the visitor sees
  only its effect. On a Spotlight the project-wide **universal sound toggle**
  stays (same as any multi-video project) and acts as the master on/off; the lit
  film's own speaker badge is the per-film control. Both flip the same project
  sound state, so they stay in sync, and on handoff sound follows the lit film.
  Sound is off by default.
- **Beat** (Listing) — a resting point in the scrub the page can snap to.
- **Listing on a small screen** — the Listing *keeps* the scrub on phones; it
  is not swapped for the stacked reduced-motion fallback. To make a card fit a
  phone-height frame it shrinks the stage and shows the **trimmed status**
  instead of the full paragraph. Only `prefers-reduced-motion` gets the static
  stacked layout.

- **The theme** (whole site) — the site renders in one of two themes: **dark**
  (the original cinematic black & gold) and **light** ("ink & gold on paper":
  a warm paper ground in the `--cream` family, near-black ink text, and the
  brand gold darkened to an ochre wherever it must be read). A first visit
  follows the device's `prefers-color-scheme`, and a visitor who never touches
  **the theme toggle** keeps following live OS changes; one tap of the toggle
  makes an explicit choice that sticks on that device and wins forever after.
  The theme grades only the room around the work — **never a photographic
  pixel** (the same hard rule The Hour lived by).
- **The theme toggle** — the control at the end of the nav links: a small
  sun/moon **glyph**, not a word. It shows the theme you are currently *in* —
  a moon while the site is dark, a sun while it is light. It carries no
  underline sweep (an underline under a 15px icon reads as an artefact); its
  hover signal is a shift to the accent gold instead. Present on every page —
  the Void and the Admin included.

  Which glyph is visible is decided in **CSS**, keyed off `data-theme`, not in
  script — so it is painted by the same pass that paints the theme and can
  never flash the wrong icon. Script owns only the accessible name, which
  names the *action* ("Switch to light theme") because a control's name has to
  say what pressing it does.

  It was originally a destination-labelled **text** control reading LIGHT /
  DARK, in the nav's 12px letterspaced voice — changed to a glyph by the
  owner, 2026-07-21.
- **The bulb** — the theme-switch transition, asymmetric like a real tungsten
  bulb: switching dark→light *flickers on* (two-three soft, irregular
  luminance pulses, well under a second, never a strobe), while light→dark
  *snaps off* instantly. Under `prefers-reduced-motion` there is no flicker —
  the swap is instant both ways.
- **The Hour** (retired) — the site once graded its **negative space** by the
  visitor's local hour: cool at dawn, warm at dusk, near-mono at night, driven
  by the device clock alone. Retired in favour of the two static **themes**:
  the grade was near-invisible in practice, and its "near-black with a hint"
  rules could not survive a light ground. Its one hard rule — never grade a
  photographic pixel — lives on in **the theme**. See
  [ADR 0015](docs/adr/0015-two-static-themes-retire-the-hour.md).
- **Shutter drag** (Void) — the long-exposure reaction: when the camera moves
  fast, each **frame** smears along its on-screen direction of travel and then
  resolves razor-sharp as the camera settles — a dragged shutter. Depth-aware
  (near frames drag more than far ones) and self-limiting (no motion, no smear),
  so the intro pull-back "racks into focus" and a still Void is perfectly sharp.
  A frame's *bright* points (a lamp, a glint, a bright sky edge) don't just
  blur — they leave **light-trails**, the way a long exposure paints moving
  light, so highlights streak brighter than the motion blur around them. The
  trail is bounded (it never blows past white) and highlight-only, so it shows
  vividly on frames that *have* point highlights and not at all on those that
  don't — see [ADR 0014](docs/adr/0014-shutter-drag-bounded-lighten-light-trails.md).
  A sibling to the living-Mosaic reactions; off under `prefers-reduced-motion`.
  The **light-trail** pass is dark-**theme**-only — a lighten-only trail cannot
  read against the light Void's bright ground; the motion smear itself runs in
  both themes.

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
  (`thumbnail.webp`, `01.webp`, …). The Admin enforces this on the way in.
- **Web-delivery encode** — videos are not kept as their original files; the
  Admin normalizes every video to a **720p H.264 MP4** tuned for fast playback
  on Indian mobile (the motion counterpart to the **WebP convention** for
  photos). GitHub's 100 MB per-file limit is a safety net, not a quality
  target — see
  [ADR 0012](docs/adr/0012-video-web-delivery-encode.md) and
  `plan-video-web-delivery.md`.
