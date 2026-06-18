# Issues — The Spotlight

Source: [plan-the-spotlight.md](plan-the-spotlight.md), [docs/prd/the-spotlight.md](docs/prd/the-spotlight.md), [ADR 0013](docs/adr/0013-film-only-mosaic-is-a-spotlight.md).

---

## 1. The mount + `.is-lit` visual contract

### What to build

Give every film in a film-only Mosaic the gold **mount** edge, and give `.is-lit`
films the full Spotlight pose (raised, full-opacity, thick warm ring). This
slice is CSS-only — no selection logic, no playback changes. Verification is
hand-toggling `.is-lit` on any `figure.mosaic__item--video` in DevTools.

- Two pseudo-element rings drawn **inside** `figure.mosaic__item--video`
  (clip-safe under the existing `overflow: hidden`):
  - `::before` — resting hairline, ~1 px inset, `--gold-dim`, always visible.
  - `::after` — lit ring, ~3–4 px inset, full `--gold`, `opacity: 0` at rest,
    `opacity: 1` under `.is-lit`. No `border-width` animation — opacity
    crossfade only, so the hairline showing through under the lit ring reads
    as "the edge thickened and warmed" in one move.
- Resting figure: `opacity: 0.55`, `transform: translateY(0)`.
- `.is-lit` figure: `opacity: 1`, `transform: translateY(-8px)`.
- All transitions named individually (no `transition: all`), reusing
  `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`. Asymmetric enter/exit:

  | Property | Enter (→ lit) | Exit (→ resting) |
  |---|---|---|
  | `transform` (rise) | `-8px`, 220 ms ease-out | `0`, 160 ms ease-out |
  | `::after` opacity (mount thicken) | `0→1`, 200 ms ease-out | `1→0`, 160 ms ease-out |
  | figure `opacity` (dim) | `0.55→1`, 200 ms ease | `1→0.55`, 200 ms ease |

- Scope: rules apply only inside `.mosaic__grid--film`. Mixed Mosaics see no
  change.

### Acceptance criteria

- [ ] Every film in a film-only project shows a faint dim-gold hairline mount
      at rest, with no visible thick ring or rise.
- [ ] Hand-adding `.is-lit` to one figure in DevTools: that figure rises ~8 px,
      its mount ring fades up to full gold over the hairline, and its opacity
      returns to 1. Removing the class reverses with the shorter exit timings.
- [ ] No `transition: all` and no `border-width` animation in the new CSS.
- [ ] Mixed Mosaics show no mount on any video (no `::before`/`::after` rings
      light up) and no opacity dim — verified by inspecting a mixed project.
- [ ] Tile settle and Frame drift still compose visibly on a lit film (the
      `.mosaic__settle` scale and the inner `<video>` translation are
      independent of the figure-level rise and ring opacity).

### Blocked by

None - can start immediately.

---

## 2. The Spotlight selection layer (sightline + hysteresis + playback fork)

### What to build

A new layer on the existing `MosaicMotion` rAF, constructed only when the
Mosaic is `isFilmOnly` (`imageCount === 0 && videoCount > 0`, which already
adds `mosaic__grid--film`). The layer picks **the lit film** from the
sightline, toggles a single class, and drives playback. CSS from #1 owns every
visual transition; this slice writes no per-frame styles.

- On `tick`, measure each film's `getBoundingClientRect()` centre against the
  viewport vertical centre and pick the film with the smallest absolute
  distance.
- **Hysteresis:** the candidate only commits as the new lit film once its
  distance is meaningfully smaller than the current lit film's — a dead-band
  large enough to prevent midpoint swap on micro-jitter, small enough to be
  invisible.
- The layer's only DOM write is `.is-lit` on the chosen
  `figure.mosaic__item--video`, removed from every other film in the same
  Mosaic.
- **Playback fork:** for the film-only path, the shared IO's "play if ≥25 %
  visible" no longer governs film-only films. Instead, this layer calls
  `play()` on the lit film and `pause()` on every other film. Resting films
  pause on their last frame. Mixed and photo-only Mosaics keep the IO rule
  unchanged.
- Arms after `mosaic:ready` (like the other living-Mosaic layers), and on arm
  picks the topmost film (nearest the sightline) and lights it immediately —
  there must never be a moment where a film-only page has no `.is-lit`.
- `atRest` returns true when the lit film hasn't changed and no transitions
  are in flight, so `MosaicMotion`'s rAF sleeps the instant the page settles.
- Single-film film-only project: that one film is `.is-lit` from
  `mosaic:ready` onwards; no handoff machinery fires.

### Acceptance criteria

- [ ] Scrolling a multi-film film-only project (desktop + mobile, both
      directions): exactly one `figure.mosaic__item--video` carries `.is-lit`
      at any settled scroll position, and exactly that figure's `<video>` is
      `!paused`. Every other film is paused.
- [ ] On a fast flick through several films, no two mounts are ever lit at
      once; the lit state retargets smoothly to the new resting film.
- [ ] Parking the scroll so two films are near-equidistant from the viewport
      centre and jittering ±a few pixels does **not** swap the lit film on
      every micro-movement (hysteresis dead-band holds).
- [ ] On a single-film film-only project, that film is `.is-lit` from
      `mosaic:ready` onwards and stays lit through scroll.
- [ ] On a fresh load of a multi-film project, the topmost film is lit before
      the visitor scrolls.
- [ ] Mixed projects (control): no `.is-lit` is ever set on any figure; every
      visible video still plays via the existing IO rule.
- [ ] DevTools Performance recording, scroll then stop: `MosaicMotion`'s rAF
      stops firing once the lit film has settled (no per-frame work after
      rest).
- [ ] From-index intro into a film-only project: scattered-to-structured
      assembly plays unchanged; the Spotlight arms only after `mosaic:ready`;
      the topmost film is lit by the time the intro hands off.
- [ ] Clicking a resting (paused) film still opens the full-screen
      `MosaicPreview`; on close, the Spotlight resumes with whichever film
      the sightline now picks (not necessarily the one lit before the click).
- [ ] Tab hidden → return: the lit film paused with the page (browser
      behaviour) and resumes when visible; no two films playing.

### Blocked by

- Issue #1 (the `.is-lit` CSS contract must exist for the class toggle to
  have any visual effect).

---

## 3. Sound: suppress the universal toggle, move the speaker badge to the lit film

### What to build

On a Spotlight there is only ever one film playing, so the project-wide
universal sound toggle has nothing to arbitrate and should not render. Sound
control lives on the lit film itself; `projectSoundOn` stays the single
source of truth.

- Extend `buildUniversalSoundToggle`'s existing early-return guard (it
  already early-returns when there is ≤1 video) so it also early-returns on
  the film-only Spotlight path. No toggle builds, no toggle button mounts in
  the DOM on a Spotlight.
- The speaker badge renders **only on the `.is-lit` figure** in a Spotlight.
  Resting films show no badge.
- Tapping the badge flips `projectSoundOn`. While on, the lit film is
  unmuted and every other film stays muted (they are paused anyway).
- On handoff: if `projectSoundOn` is true, the new lit film unmutes and the
  old lit film mutes — `projectSoundOn` is not flipped by handoff; only its
  *target* film changes.
- Mixed and photo-only Mosaics: universal toggle behaves byte-for-byte as
  today.

### Acceptance criteria

- [ ] On a film-only project, no universal sound toggle is present anywhere
      in the DOM at any scroll position.
- [ ] The speaker badge is rendered on exactly the `.is-lit` figure and on
      no other figure; it appears/disappears as the lit state hands off.
- [ ] Tapping the lit film's badge unmutes that `<video>` and flips
      `projectSoundOn` to true. Scrolling to the next film: the new lit
      film is unmuted, the previous one is muted, `projectSoundOn` stays
      true, and never are two `<video>` nodes unmuted at once.
- [ ] Tapping the badge again with sound on flips `projectSoundOn` to false
      and mutes the lit film.
- [ ] Mixed project (control): the universal sound toggle is present and
      behaves exactly as today; no speaker badge appears on the figure level.

### Blocked by

- Issue #2 (the badge is rendered against `.is-lit`, and handoff is what
  moves sound).

---

## 4. Reduced motion: keep one-film-at-a-time logic, drop the motion

### What to build

Under `prefers-reduced-motion: reduce`, the Spotlight's **logic** (one film
playing at a time, sightline-driven handoff, sound following the lit film,
no universal toggle) must still apply — "which film is on" is logic, not
motion. What disappears is the rise, the mount-thicken crossfade, and the
opacity dim transitions: `.is-lit` and its absence become instant state
swaps.

- CSS: under `@media (prefers-reduced-motion: reduce)`, zero out the
  `transform`, `::after` opacity, and figure `opacity` transition durations
  on `.mosaic__item--video` so state swaps are instantaneous. The resting
  vs lit values themselves (raised vs flat, dim vs full, hairline vs full
  ring) still apply — only the *animation* of the swap is removed.
- JS: `MosaicMotion`'s engine no-ops under reduced motion, so the Spotlight
  cannot rely on `tick` in that mode. Provide a small fallback selection
  path (a throttled scroll listener) that runs **only** when reduced motion
  is on, performs the same sightline + hysteresis pick, and drives the
  same class toggle + play/pause + sound handoff.
- The fallback must not run when reduced motion is off (no double writers).
- All other Spotlight contracts from #2 and #3 hold under reduced motion.

### Acceptance criteria

- [ ] Toggling `prefers-reduced-motion: reduce` and reloading a film-only
      project: exactly one film plays at a time and handoff still occurs on
      scroll, but `.is-lit` swaps with no visible rise, no ring crossfade,
      and no opacity fade — the change is instantaneous.
- [ ] Under reduced motion, the topmost film is lit on load and the sound
      handoff (issue #3) still works as the lit film changes.
- [ ] Under reduced motion, no universal sound toggle is present on a
      film-only project; the badge still lives on the lit film.
- [ ] With reduced motion off, no second scroll listener runs (the rAF
      tick from #2 is the sole selection path) — verified by checking that
      the reduced-motion fallback is gated on the media query at
      construction.
- [ ] Mixed project under reduced motion: behaves as today; no `.is-lit`
      set, universal toggle present.

### Blocked by

- Issue #2 (selection layer must exist; this slice adds the reduced-motion
  fallback path and the CSS overrides).
