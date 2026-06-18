# Plan — The Spotlight (film-only Mosaic, one lit film at a time)

## Goal

Make a **film-only** project's Mosaic (`project.html` / `mosaic.js`, the
`mosaic__grid--film` single-column video stack) read like a curated reel instead
of a wall of competing autoplay. As you scroll, exactly one video — **the lit
film** — is "on": its gold edge (**the mount**) thickens and warms, it rises a
few pixels, and it is the only video playing. Every other film rests dimmed and
paused. The line that picks the lit film is **the sightline**: an invisible line
at the viewport's vertical centre.

This is film-only and the *same on every device*. Mixed photo+video Mosaics are
untouched. See [ADR 0013](docs/adr/0013-film-only-mosaic-is-a-spotlight.md) for
the rationale and the rejected alternatives (fixed visible band; thick 25 %
mat-by-scale-down; extending to mixed grids).

## Hard constraints (locked via grill)

- **Film-only only.** Detected today as `imageCount === 0 && videoCount > 0`
  ([mosaic.js:68](mosaic.js)). Mixed Mosaics keep greedy multi-play, the
  universal sound toggle, and everything else exactly as today.
- **Same mechanic on every device.** No desktop-only path; no 25 % scale-down.
  The mount is an animated edge, so it works identically at any width.
- **Transform/opacity only.** The rise (`translateY`), the dim (`opacity`), and
  the mount thicken (`opacity` crossfade of layered rings) are all
  compositor-cheap. No `border-width` animation, no paint-heavy filters added.
- **One shared writer, sleeps when idle.** Reuse the Mosaic's existing
  `MosaicMotion` rAF; the sightline check is just one more scroll-driven layer
  that lets the loop sleep when the lit film hasn't changed and nothing is moving.
- **Reduced motion:** drop the rise and all transitions (instant state changes,
  no movement) but **keep** single-lit-film selection + playback — that is logic,
  not motion. The page is still a one-film-at-a-time reel, just without the glide.
- **Click-to-preview untouched.** Clicking any film (lit or resting) still opens
  the full-screen `MosaicPreview`; the Spotlight is the *browse* layer beneath it.

## The states (named)

| Term | What it is |
|------|-----------|
| **The Spotlight** | The film-only Mosaic behaviour as a whole |
| **The sightline** | Invisible viewport-vertical-centre line; picks the lit film (nearest centre) |
| **The lit film** | The one active video: mount lit + raised + playing + audible-capable |
| **The mount** | Each video's gold edge — dim hairline at rest, thick + full gold when lit |

### Resting film
Full-bleed video, **paused on its last frame**, mount a faint dim-gold hairline,
the whole tile dimmed (`opacity ≈ 0.55`). No sound badge.

### The lit film
Mount thickens and warms to full `--gold`; tile returns to `opacity: 1`; the
framed film **rises ~8 px**; the video **plays**; if project sound is on, it is
the audible film and shows its **speaker badge**.

### Handoff
As the sightline crosses from one film to the next, the old lit film lowers +
dims + pauses and the new one rises + lights + plays. Driven by **CSS
transitions** (interruptible — a fast scroll that blows through several films
retargets smoothly instead of restarting), never keyframes.

## Motion spec (Emil-grade)

Reuse the site's existing strong ease-out where possible:
`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` (the same curve Tile settle uses).

| Property | Enter (→ lit) | Exit (→ resting) | Why |
|----------|---------------|------------------|-----|
| Rise (`translateY`) | `-8px`, 220 ms `--ease-out` | `0`, 160 ms `--ease-out` | Enter is the system responding to *you* — ease-out, immediate. Exit faster (asymmetric): the lit film is leaving, no need to dwell. |
| Mount thicken (ring `opacity`) | `0→1`, 200 ms `--ease-out` | `1→0`, 160 ms `--ease-out` | Thickens *from* the always-present hairline, never from nothing. Opacity crossfade = GPU-cheap; no `border-width` layout thrash. |
| Tile dim (`opacity`) | `0.55→1`, 200 ms ease | `1→0.55`, 200 ms ease | A plain comprehension fade; symmetric is fine here. |

- **No `transition: all`** — name each property.
- **Hairline → thick is two layered rings, not an animated border.** The mount is
  drawn as **inner** rings (clip-safe under the frame's `overflow: hidden`):
  - `::before` — the resting hairline, ~1 px inset, `--gold-dim`, always visible.
  - `::after` — the lit ring, ~3–4 px inset, `--gold`, `opacity: 0` at rest →
    `opacity: 1` on `.is-lit`. The hairline showing through *under* the lit ring
    reads as "the edge thickened and warmed" in one move.
- **Sightline hysteresis.** Add a small dead-band so two near-equidistant films
  don't rapidly swap the lit state at the exact midpoint — the handoff commits
  only once the next film is clearly nearer. An invisible edge case handled
  invisibly.

## Architecture

### Transform ownership (no new DOM nodes)

The single-column film stack makes translating the `figure` **seam-safe** — the
"`figure` carries no transform" rule from the living-Mosaic plan exists to stop
seams in the *multi-column* grid and does not apply here. So the rise lives on the
figure and nothing has to be re-parented:

```
figure.mosaic__item--video      ← rise (translateY) + the mount (::before / ::after rings); overflow: hidden
  └── .mosaic__settle           ← Tile settle (scale)        — unchanged
        └── video               ← Frame drift (translate, overscanned) — unchanged
```

The mount rings ride the figure, so they rise *with* the film — the whole framed
film lifts as one. Frame drift keeps working on the video node beneath, composing
with the rise (they are on different nodes). Tile settle is untouched.

### Selecting the lit film

A film-only layer registered on the existing `MosaicMotion` engine
([mosaic.js](mosaic.js)):

- On scroll (and once on load), measure each film's centre against the viewport
  centre, apply the hysteresis dead-band, and pick the nearest as the lit film.
- It only **toggles a class** (`.is-lit` on the chosen figure, removed from the
  rest) — CSS owns every visual transition. No per-frame style writes for the
  mount/rise, so the rAF can sleep the instant the lit film stops changing.
- The same selection drives **playback**: `play()` the lit film, `pause()` the
  others. This replaces the ≥25 %-visible IO rule *for the film-only path only*;
  the IO and greedy playback stay intact for photo/mixed Mosaics.

### Sound

- `projectSoundOn` stays the single source of truth.
- The **universal toggle is not built** for a Spotlight (`buildUniversalSoundToggle`
  already early-returns for ≤1 video; extend it to also skip the film-only
  Spotlight path).
- The speaker **badge renders only on the lit film**. Toggling it flips
  `projectSoundOn`; while on, the lit film is unmuted and all others muted (they
  are paused anyway). On handoff, if sound is on, it moves to the new lit film.

## Scenarios / edge cases to honour

- **Fast scroll through several films** — transitions (not keyframes) retarget
  smoothly; no flicker of three mounts lighting at once. Hysteresis prevents
  midpoint thrash.
- **Single-video film-only project** — that one video is always the lit film:
  mount lit, raised, playing. No handoff, no dead-band needed.
- **Reduced motion** — no rise, no transitions (instant lit/resting swap), but
  still one film playing at a time; the reel logic is preserved.
- **Reload / direct load vs from-index** — on load the topmost film (nearest the
  sightline) is lit immediately; from-index intro assembly is unaffected (the
  Spotlight layer arms after `mosaic:ready`, like the other living-Mosaic layers).
- **Click-to-preview** — clicking a resting (paused) film still opens it
  full-screen and plays it there; on close, the Spotlight resumes with whatever
  film the sightline now picks.
- **Tab hidden** — the lit film pauses with the page like any video; nothing
  special, but worth a manual check.
- **Mixed photo+video Mosaic** — none of this runs; greedy playback + universal
  toggle behave exactly as today.

## Out of scope

- Mixed photo+video Mosaics — explicitly excluded (ADR 0013).
- Any visible band/lane, or a 25 % video scale-down/mat — both rejected (ADR 0013).
- The Void, the Projects index, the Listing — Mosaic-only, film-only.
- New sound behaviour beyond relocating the existing on/off to the lit film badge.

## Verification

- **Desktop + mobile, scroll a multi-film project:** exactly one mount is lit and
  raised at a time; only that film is playing; the lit state hands off cleanly as
  you scroll, both directions; no two mounts lit at once on a fast flick.
- **Resting films:** paused on a frame, dimmed, faint hairline mount, no badge.
- **Sound:** no universal toggle present; the lit film's badge toggles sound;
  turning it on and scrolling moves audio to each new lit film; never two audible.
- **Single-film project:** that film is permanently lit/raised/playing.
- **Reduced motion:** no rise/transitions, but still one-film-at-a-time playback.
- **Mixed project (control):** unchanged — multiple videos play, universal toggle
  present.
- **Idle (DevTools Performance):** the rAF is not running once the lit film has
  settled and scrolling has stopped.

## Naming → `CONTEXT.md`

Done inline with this plan: **The Spotlight**, **the lit film**, **the mount**,
**the sightline** added under *Behavioural vocabulary*, cross-linked to ADR 0013.
"Focus" (Void) and "gate" (Gate shear) were deliberately *not* reused.

## Open follow-ups (not in this pass)

- Tune the exact rise distance, mount thickness, and dim level on a real device
  pass — the values above are Emil-defaults, not yet eyeballed in situ.
- Decide whether a resting film should also desaturate slightly (grayscale) on
  top of the opacity dim. Left out for now to keep to transform/opacity only.
