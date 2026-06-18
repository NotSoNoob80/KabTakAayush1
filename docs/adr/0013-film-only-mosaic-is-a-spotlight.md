# 0013 — The film-only Mosaic is a Spotlight: one lit film at a time, picked by a sightline

- Status: Accepted
- Date: 2026-06-18

## Context

A project's [Mosaic](../../mosaic.js) plays video greedily. A shared
`IntersectionObserver` plays *every* video that is ≥25 % on screen and pauses the
rest, so on a tall page several videos decode and play at once. Sound layers a
"one unmuted at a time, follows the scroll" rule on top, and when a project has
more than one video the page grows a **project-wide universal sound toggle** to
arbitrate which of the simultaneously-playing videos is audible
([mosaic.js](../../mosaic.js)).

A **film-only** project — one that is all video, no photos (`imageCount === 0`)
— already renders differently: not the 3-column collage but a single, full-width
16/9 vertical column (`mosaic__grid--film`,
[styles.css](../../styles.css)). It reads like a strip of film, but it still
*behaves* like the photo grid: many videos playing, none privileged.

The idea on the table: make a film-only project feel like a curated reel where
**one film is "on" at a time** — lit, raised, and the only one playing — instead
of a wall of competing autoplay. The hard question a grill surfaced was *which*
video is "on", and whether the treatment generalises to mixed photo+video
Mosaics. It does not, and that turns out to be the load-bearing decision.

## Decision

For **film-only projects only**, the Mosaic becomes **the Spotlight**:

- **The sightline picks the lit film.** An invisible line at the viewport's
  vertical centre selects **the lit film** — the video whose centre is nearest
  it. Exactly one video is the lit film at any moment; as the visitor scrolls,
  it hands off down the column. On load the topmost video is the lit film.
- **Only the lit film plays.** Every other video is paused on its last frame.
  This *replaces* the ≥25 %-visible multi-play rule for film-only projects.
- **The mount, not a mat.** Each video carries a gold edge — **the mount** — a
  faint dim-gold hairline at rest that thickens and warms to full `--gold` on the
  lit film. The video stays **full-bleed**; only the edge changes.
- **The lit film rises** a few pixels and returns to full colour; resting films
  are dimmed. Motion is transform/opacity only.
- **One system, every device.** Desktop and mobile run the identical mechanic.
- **No universal sound toggle on a Spotlight.** With one video ever playing
  there is nothing to arbitrate. The lit film's own speaker badge is the sole
  sound control; sound is off by default and follows the lit film on handoff.
  Mixed projects keep the universal toggle and today's multi-play behaviour.

Mixed photo+video Mosaics are **untouched** — same greedy playback, same
universal toggle.

## Alternatives considered

- **A fixed, visible "shaded band" pinned in the viewport** that videos scroll
  through. Rejected as the *visual*: a strip pinned across the screen reads as
  page chrome, and the highlight wants to live *around the video*, not in a lane
  it passes under. The band's one virtue — an unambiguous "which is active" — is
  kept as the **invisible** sightline.
- **A thick gold mat revealed by scaling every video down 25 %.** This was the
  original framing ("scale the mosaic down on desktop so the mat shows").
  Rejected: it eats a quarter of *every* video *permanently*, even at rest and
  even for films you are not watching, and the literal-25 % surround looked heavy
  and behaved inconsistently across screen sizes (tiny videos on phones). An
  animated **mount** asserts itself only on the lit film, leaves the video
  full-bleed, and scales to any width for free — so "same feel on every device"
  costs nothing. It also satisfies the "never animate from nothing" rule: the
  mount *thickens from a hairline* rather than appearing from zero.
- **Extending the Spotlight to mixed Mosaics.** Rejected. The sightline is only
  unambiguous in a *single vertical column*, where one tile occupies each scroll
  position. In a 2-D collage a horizontal sightline cuts through several tiles at
  once and "the lit film" becomes ill-defined; a gold mount around one video
  while photos sit beside it would read as broken. Film-only's single column is
  *why* the mechanic is clean — it is a feature of the layout, not a constraint
  to engineer around.

## Consequences

- **Playback logic forks for film-only.** The shared IO's "play while ≥25 %
  visible" rule is replaced, for the film-only path, by "play iff lit". Fewer
  simultaneous decodes is a net win for mobile data and battery — a side benefit,
  not the goal.
- **Sound simplifies for film-only.** `projectSoundOn` stays the single source of
  truth, but its UI moves from the (now-removed) universal toggle to the lit
  film's badge, shown only on the lit film. The "follows the scroll" rule becomes
  deterministic: sound rides the lit film.
- **Transform ownership needs a home for the rise.** Tile settle already owns
  `.mosaic__settle`'s transform and Frame drift owns the video node's; the rise
  takes a third node so none clobber another (the single-column film stack makes
  translating the `figure` itself seam-safe — the multi-column no-figure-transform
  rule does not apply here). Detailed in
  [`plan-the-spotlight.md`](../../plan-the-spotlight.md).
- **Frame drift is kept** on the lit film and composes with the rise (they live
  on different nodes) — the lit film both drifts subtly and sits raised.
- **Reduced motion** drops the rise and the thicken/dim transitions (instant
  state changes, no movement) but **keeps** the single-lit-film selection and
  playback — that part is not motion.
- **If a future layout wants a Spotlight in a non-single-column context**, the
  right move is to re-open this ADR, not to bolt a 2-D "which is active" heuristic
  onto the sightline.
