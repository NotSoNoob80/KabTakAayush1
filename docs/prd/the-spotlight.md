# PRD — The Spotlight (film-only Mosaic, one lit film at a time)

## Problem Statement

A visitor opens a **film-only** project (all video, no photos — the
`mosaic__grid--film` single-column stack) and is met by a wall of competing
autoplay. The shared `IntersectionObserver` plays *every* video that is ≥25 %
on screen, so on a tall page three or four films decode and play at once, each
locked to its own muted loop. Because more than one video exists, the page also
grows a **project-wide universal sound toggle** that has to arbitrate which of
the simultaneously-playing films is audible.

The film-only column already *looks* like a strip of film — but it does not
*behave* like one. There is no privileged "now playing" film, no curated
reading order, no quiet around the work. A page that is supposed to read as a
reel reads as a feed.

The single-column stack makes the answer almost obvious in retrospect: with one
film at each scroll position, "which one is on" is unambiguous. The site just
isn't taking advantage of it.

## Solution

For **film-only Mosaics only**, become **the Spotlight**: at any moment exactly
one video — **the lit film** — is "on". Its **mount** (the gold edge around
every film) thickens and warms to full `--gold`, the framed film rises a few
pixels, it is the only video playing, and if project sound is on it is the
audible film. Every other film rests dimmed and paused on its last frame, with
its mount as a faint dim-gold hairline.

Which film is lit is decided by **the sightline** — an invisible line at the
viewport's vertical centre. The film whose centre sits nearest the sightline is
the lit film. Scroll moves the sightline, and the lit state hands off down the
column, one film at a time. On a fresh load the topmost film (nearest the
sightline) is lit immediately.

Because only one film ever plays, **the universal sound toggle is removed on a
Spotlight** — there is nothing to arbitrate. The lit film carries its own
speaker badge; toggling it flips `projectSoundOn`, and on each handoff the
audio moves to the new lit film.

Mixed photo+video Mosaics are **untouched** — same greedy multi-play, same
universal sound toggle, same everything. The Spotlight is a *layout-specific*
behaviour, not a global rewrite. See
[ADR 0013](../adr/0013-film-only-mosaic-is-a-spotlight.md) for the rationale
and the rejected alternatives (a fixed visible "shaded band"; a 25 % video
scale-down with a thick mat; extending the mechanic to mixed grids).

The new vocabulary — **the Spotlight**, **the lit film**, **the mount**,
**the sightline** — is already in `CONTEXT.md` under *Behavioural vocabulary*.

## User Stories

1. As a visitor on a film-only project, I want exactly one film to be playing
   at any given moment, so that the page reads as a curated reel rather than a
   wall of competing autoplay.
2. As a visitor scrolling a film-only project, I want the playing film to be
   the one closest to the centre of my screen, so that the film I am actually
   looking at is the one I am actually watching.
3. As a visitor, I want the lit film to be visibly distinguished from the
   resting films — a gold edge that thickens, a small rise, full colour — so
   that I never have to guess which film is "on".
4. As a visitor, I want the resting films to stay visible (not hidden, not
   blanked) so that I can still see what is coming next and what I just left
   behind, just dimmer and paused.
5. As a visitor scrolling slowly between films, I want the lit state to hand
   off cleanly from the old film to the new one, so that the change reads as
   one continuous gesture rather than two flickers.
6. As a visitor scrolling fast through several films, I want the transitions
   to retarget smoothly rather than queue up — I should never see three mounts
   lit at once or a stale ring still warming after I've stopped on a new film.
7. As a visitor whose scroll lands almost exactly between two films, I want
   the lit state to commit to one of them rather than rapidly swap back and
   forth at the midpoint, so that the page does not strobe under me.
8. As a visitor on a film-only project with only one video, I want that single
   film to be permanently lit, raised, and playing, so that the Spotlight
   logic does not produce a "no film selected" pose on a single-film page.
9. As a visitor who lands on a film-only project for the first time, I want
   the topmost film to be lit immediately on load, so that there is never a
   moment where the page is film-only but nothing is playing.
10. As a visitor who turns project sound on, I want the audio to come from the
    lit film and to follow the lit film as I scroll, so that I never have to
    think about *which* film I am hearing.
11. As a visitor on a film-only project, I want there to be no project-wide
    universal sound toggle, so that the page chrome does not advertise a
    decision (which of several films is audible) that no longer needs to be
    made.
12. As a visitor on a film-only project, I want the speaker badge to appear
    only on the lit film, so that the sound control lives where the sound is.
13. As a visitor with `prefers-reduced-motion`, I want the one-film-at-a-time
    *playback* to still apply — the rise and the thicken/dim transitions should
    drop, but I should still see one film playing and the rest paused, because
    "which film is on" is logic, not motion.
14. As a visitor on a mixed photo+video Mosaic, I want nothing about my
    experience to change — every visible video should still play, the
    universal sound toggle should still appear, and no gold mount should wrap
    a single video while photos sit beside it.
15. As a visitor who taps any film (lit or resting), I want the full-screen
    `MosaicPreview` to open exactly as it does today, so that the Spotlight is
    only the *browse* layer and click-to-preview is preserved.
16. As a visitor who closes the preview, I want the page to resume the
    Spotlight with whichever film the sightline now picks, rather than
    restoring whichever film was lit before.
17. As a mobile visitor on a film-only project, I want the same mechanic
    desktop visitors get — no special "phone version" of the Spotlight, no
    25 % shrink, no separate sound model — so that the project feels the same
    on every device I share it from.
18. As a visitor on a slow connection, I want the page to not be decoding
    three muted films in parallel just so they can sit there at ≥25 % visible,
    so that the film-only Mosaic costs less to scroll past.
19. As a visitor scrolling reverse (down a film, then back up to the previous
    one), I want the previously-lit film to re-light as my sightline crosses
    back into it, so that handoff works the same in both directions.
20. As a visitor whose tab loses focus, I want the lit film to pause with the
    page like any other video, so that I do not return to find it has played
    minutes into itself unattended.
21. As a developer maintaining the Mosaic, I want the Spotlight to ride on the
    existing `MosaicMotion` rAF and to sleep the loop the moment the lit film
    settles, so that adding it does not regress the v22/v23 de-jank work the
    living Mosaic was built around.
22. As a developer maintaining the Mosaic, I want the Spotlight to introduce
    no new DOM nodes — only a class toggle on the existing `figure` and two
    CSS pseudo-element rings — so that the from-index intro, Tile settle, and
    Frame drift continue to work unchanged on the same nodes.
23. As Aayush updating the Manifest, I want the rule for "is this project a
    Spotlight" to be the same `imageCount === 0 && videoCount > 0` check that
    already chooses the film-only grid, so that there is no second authoring
    knob to remember.

## Implementation Decisions

- **Scope gate is the existing film-only classifier.** A Mosaic enters the
  Spotlight iff `mosaic.js` flags it `isFilmOnly` (`imageCount === 0 &&
  videoCount > 0`) and adds `mosaic__grid--film`. No new Manifest field; no
  new "is spotlight" flag. Mixed Mosaics never enter the path.
- **The Spotlight is one new layer on `MosaicMotion`.** It registers via the
  existing `MosaicMotion.register({ tick, atRest })` seam — the same seam
  Frame drift, Tile settle, and Gate shear use. No second rAF, no second
  scroll listener pattern. The layer is film-only-guarded at construction and
  is a no-op on every other Mosaic.
- **Sightline measurement.** On `tick`, the layer measures each film's
  bounding-rect centre against the viewport vertical centre and picks the
  film with the smallest absolute distance. Hysteresis: a candidate only
  commits as the new lit film once its distance is meaningfully smaller than
  the current lit film's — a small dead-band, large enough to prevent
  midpoint swap, small enough to be invisible. `atRest` returns true when the
  lit film hasn't changed and no transitions are in flight, so the rAF sleeps.
- **The lit state is a single class.** The layer's only DOM write is
  `.is-lit` on the chosen `figure.mosaic__item--video`, removed from every
  other film. CSS owns every visual transition. No per-frame inline style
  writes — adding the Spotlight does not add per-frame compositor work.
- **CSS owns the mount.** Each film's `figure.mosaic__item--video` gains two
  pseudo-element rings, drawn *inside* the figure (clip-safe under the
  existing `overflow: hidden`):
  - `::before` — the resting hairline, ~1 px inset, `--gold-dim`, always
    visible.
  - `::after` — the lit ring, ~3–4 px inset, full `--gold`, `opacity: 0` at
    rest, `opacity: 1` under `.is-lit`. The hairline showing through *under*
    the lit ring reads as "the edge thickened and warmed" in one move. No
    `border-width` animation — opacity crossfade only.
- **The rise lives on the figure.** Because the film-only grid is a single
  vertical column, translating `figure` itself is seam-safe — the multi-
  column "figure carries no transform" rule from the living-Mosaic plan does
  not apply here. `figure.is-lit` gets `translateY(-8px)`; `figure` (resting)
  is at `0`. No re-parenting. Tile settle (on `.mosaic__settle`) and Frame
  drift (on the `<video>` node) continue to compose on the nodes beneath.
- **Motion spec is asymmetric, no `transition: all`.** Each property is
  named separately, reusing the site's existing
  `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`:

  | Property | Enter (→ lit) | Exit (→ resting) |
  |---|---|---|
  | `transform` (rise) | `-8px`, 220 ms ease-out | `0`, 160 ms ease-out |
  | `::after` opacity (mount thicken) | `0→1`, 200 ms ease-out | `1→0`, 160 ms ease-out |
  | tile `opacity` (dim) | `0.55→1`, 200 ms ease | `1→0.55`, 200 ms ease |

  Transitions, not keyframes, so a fast scroll retargets smoothly instead of
  restarting.
- **Playback rule forks for film-only.** The shared IO's "play if ≥25 %
  visible" rule no longer governs film-only films. Instead, the Spotlight
  layer drives playback directly: `play()` the lit film, `pause()` every
  other film. Mixed and photo-only Mosaics keep the IO rule exactly as today.
- **Universal sound toggle is suppressed on a Spotlight.**
  `buildUniversalSoundToggle` already early-returns when there is ≤1 video;
  its guard extends to also early-return on the film-only path. No toggle
  builds, no toggle button mounts.
- **Speaker badge moves to the lit film.** The badge renders only on the
  `.is-lit` figure. Tapping it flips `projectSoundOn`; while on, the lit
  film is unmuted and every other film stays muted (they are paused anyway).
  On handoff, if `projectSoundOn` is true, the new lit film unmutes and the
  old one mutes — `projectSoundOn` remains the single source of truth.
- **Reduced motion drops *motion*, not logic.** Under
  `prefers-reduced-motion`, the layer still registers, still picks the lit
  film, still drives play/pause and sound. What disappears is the rise and
  the thicken/dim transitions — `.is-lit` and its absence become instant
  state swaps. (`MosaicMotion`'s reduced-motion path no-ops the *engine*;
  the Spotlight's selection runs in a smaller rAF-or-scroll-listener
  fallback that exists only when reduced motion is on, since the rAF engine
  is otherwise disabled.)
- **Arming order.** The Spotlight layer arms after `mosaic:ready`, like the
  other living-Mosaic layers, so the from-index scattered-to-structured
  intro is unaffected. On `mosaic:ready` it picks the topmost film (nearest
  the sightline) and lights it.
- **No new vocabulary work needed.** *The Spotlight*, *the lit film*,
  *the mount*, *the sightline* are already in `CONTEXT.md`. "Focus" (Void)
  and "gate" (Gate shear) were deliberately *not* reused.

## Testing Decisions

A good test here describes the **visitor-visible contract** — what the page
*does*, not how the code is organised. The contract is small and easy to
phrase: on a film-only Mosaic, exactly one `figure.mosaic__item--video` carries
`.is-lit` at any settled scroll position, and exactly that figure's `<video>`
is `!paused`. The contract is *the same* under reduced motion; only the
transitions disappear. On a mixed Mosaic the contract is "nothing changes",
i.e. no `.is-lit` ever sets and `buildUniversalSoundToggle` mounts as today.

The site does not run a unit-test harness — verification is per-PR manual
passes against named scenarios (the pattern used for The Reach, the living
Mosaic, and the video web-delivery slices). The Spotlight follows the same
pattern. The pass list, mapped to the contracts above:

- **Multi-film film-only, desktop + mobile, scroll both directions.** Exactly
  one mount is lit and one figure is raised at any settled point; only that
  film is playing. Hand off cleanly forward *and* reverse. No two mounts lit
  at once on a fast flick.
- **Sightline hysteresis.** Park the scroll so two films are near-equidistant
  from the viewport centre, then jitter ±a few pixels: the lit film should
  *not* swap on every micro-movement; the dead-band should hold.
- **Single-film film-only project.** That one film is `.is-lit` from
  `mosaic:ready` onwards and stays lit through scroll. No handoff machinery
  fires.
- **Reduced motion.** Toggle `prefers-reduced-motion: reduce` and reload: one
  film still plays at a time, handoff still occurs on scroll, but `.is-lit`
  swaps without rise/dim/thicken transitions.
- **Mixed project (control).** Open a project with at least one photo: no
  `.is-lit` is ever set on any figure; the universal sound toggle is present;
  every visible video plays as today.
- **Sound on a Spotlight.** No universal toggle in the DOM. Tap the lit
  film's speaker badge → its `<video>` is unmuted; scroll to the next film →
  audio moves with the lit state; never two films audible at once.
- **Click-to-preview.** Tap a resting (paused) film → full-screen
  `MosaicPreview` opens and plays the tapped film. Close the preview → the
  Spotlight resumes with whichever film the sightline now picks (not
  necessarily the one that was lit before).
- **Tab hidden.** Switch tabs while a film is lit → return: the lit film is
  paused (browser behaviour) and resumes when the page is visible, no two
  films playing.
- **Idle is idle.** DevTools Performance recording, scroll a Spotlight, then
  stop: confirm `MosaicMotion`'s rAF stops firing once the lit film has
  settled (no per-frame work after rest).
- **From-index intro.** Click into a film-only project from the index: the
  scattered-to-structured assembly plays unchanged, the Spotlight arms only
  after `mosaic:ready`, and the topmost film is lit by the time the intro
  hands off.

Prior art for this verification style lives in:
[plan-the-living-mosaic.md](../../plan-the-living-mosaic.md) §Verification,
[docs/prd/the-living-mosaic.md](the-living-mosaic.md),
[docs/prd/the-reach.md](the-reach.md), and the `plan-the-spotlight.md`
verification section itself.

## Out of Scope

- **Mixed photo+video Mosaics.** Explicitly excluded by
  [ADR 0013](../adr/0013-film-only-mosaic-is-a-spotlight.md). They keep
  greedy multi-play and the universal sound toggle, byte-for-byte as today.
- **A visible band/lane.** The sightline stays invisible — a strip pinned
  across the viewport reads as page chrome and was rejected in ADR 0013.
- **A 25 % video scale-down with a thick mat.** Rejected in ADR 0013; the
  mount is an animated edge on a full-bleed video, not a permanent mat.
- **The Void, the Projects index, the Listing.** None of them carry a
  Spotlight; this PRD is Mosaic-only and film-only-only.
- **New sound mechanics beyond relocation.** `projectSoundOn` is still the
  single source of truth; the only behaviour change is where its UI lives
  and how handoff carries it.
- **Tuning the exact rise distance, mount thickness, and dim level on a real
  device pass.** The numbers in this PRD are Emil-defaults; the eyeball
  pass is a follow-up, not a blocker.
- **Optional resting-film desaturation (grayscale on top of opacity).**
  Deferred to keep the motion set strictly transform/opacity.

## Further Notes

- **Naming was deliberate.** "Focus" already names Void's
  click-to-glide-front-and-centre gesture; "gate" already names Gate shear.
  Neither was reused. *The Spotlight*, *the lit film*, *the mount*, and
  *the sightline* are net-new and cross-linked from `CONTEXT.md` to
  [ADR 0013](../adr/0013-film-only-mosaic-is-a-spotlight.md).
- **The de-jank lesson is honoured.** The Spotlight registers as one more
  layer on the shared `MosaicMotion` rAF. The loop sleeps when the lit film
  has not changed and no transitions are in flight. CSS owns every visual
  transition, so there are no per-frame style writes for the mount/rise —
  consistent with the v22 baseline the reach-v23-dejank-regression memory
  records.
- **Frame drift composes through.** The mount and the rise live on the
  `figure` and `::before`/`::after`; Frame drift still translates the
  `<video>` node beneath. The lit film both drifts subtly *and* sits raised.
- **Authoring is unchanged.** Aayush does not learn a new field. A project
  becomes a Spotlight by virtue of having only videos and no photos — the
  same condition that already triggers the film-only single-column grid.
