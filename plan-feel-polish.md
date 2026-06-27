# Plan — Feel & Motion Polish Pass

## Goal

A single, low-risk tightening pass over the site's motion, prompted by an
Emil-Kowalski-style review. The codebase is already strongly motion-literate
(custom easing curves, `scale(0.97)` press on `.btn`/`.back-btn`, origin-aware
clip-path reveals, comprehensive `prefers-reduced-motion`, lerp-smoothed reel,
WAAPI Glissando). This pass closes the **small** set of remaining gaps without
touching any of that working machinery.

Six changes, grouped: one bug-adjacent correctness fix (global smooth-scroll
fighting the Listing), one dead-code removal, two missing press-feedback /
entrance details, and two tunings (scroll reveal, reel lerp).

## What we are NOT touching (already good — leave alone)

These were reviewed and are doing the right thing; no change:

- The custom easing tokens `--ease-out` / `--ease-in-out` ([styles.css:21](styles.css)).
- `.btn` / `.back-btn` press + clip-path gold fill-sweep ([styles.css:627](styles.css)).
- Origin-aware motion: reel preview `clip-path: circle()` at the clicked pixel,
  easter-toast `transform-origin: top left`, footer char `bottom center`.
- The WAAPI Glissando (interruptible spring-back) ([script.js:194](script.js)).
- The `is-scrolling` → `pointer-events: none` sticky-hover fix ([styles.css:1178](styles.css)).
- Deliberate timing *contrast* on the SOLD stamp (`--ease-in-out` snap vs the
  site's `--ease-out`) — intentional impact, keep it.
- All `prefers-reduced-motion` blocks.

## Hard constraints (locked via grill)

- **One combined plan / one branch.** All six tweaks ship together as a single
  "feel & motion polish" change, not split per-area.
- **No new vocabulary.** None of these introduce a named concept, so `CONTEXT.md`
  is untouched. These are tunings of existing surfaces, not new behaviours.
- **No ADR.** None of the six clears the full bar (hard-to-reverse + surprising +
  real trade-off). The one trap-worthy decision (global smooth-scroll removal) is
  guarded by an **inline code comment**, not a formal ADR.
- **Transform/opacity only**, consistent with the rest of the site. No new
  paint-heavy properties introduced; the reveal change *reduces* paint cost.
- **Reduced motion stays correct.** Any retuned value must keep its existing
  `prefers-reduced-motion` fallback intact.
- **Final visual numbers are eyeballed on-device.** The durations / scales below
  are Emil-defaults and starting points, not committed-by-fiat values.

## The changes

| # | Change | Where | Risk | Decision |
|---|--------|-------|------|----------|
| 1 | Remove global `scroll-behavior: smooth` | [styles.css:35](styles.css) | low | Remove globally |
| 2 | Delete dead project-grid `.card`/`.grid` block | [styles.css:657](styles.css)–761 | low | Delete entirely |
| 3 | Add `:active` press feedback to 4 icon/pill controls | styles.css (see below) | low | The 4 controls only |
| 4 | Make the modal preview entrance perceptible | [styles.css:2680](styles.css) | low | `scale(0.95)→1` |
| 5 | Retune `[data-reveal]` (faster, cheaper) | [styles.css:326](styles.css) | low | Moderate tighten |
| 6 | Frame-rate-normalize the reel lerp | [script.js:765](script.js) | medium | Normalize, 60Hz-anchored + A/B |

---

### 1. Remove global `scroll-behavior: smooth`

**Why.** `html { scroll-behavior: smooth }` is global, but **nothing navigates by
in-page anchor** — every `href="#…"` in the markup is an SVG `<use>` reference,
not a link. Meanwhile `listing.js` runs its **own** snap-to-beat scroll: it lerps
`window.scrollY` toward a beat by calling `window.scrollTo(0, newY)` *every frame*
([listing.js:367](listing.js), [373](listing.js)). With global smooth on, the
browser tries to *animate* to each of those per-frame targets too — two smoothing
systems fighting over one scroll position. Removing the global rule lets
listing.js own its motion cleanly.

- `admin.html` calls `scrollIntoView({ behavior: 'smooth' })` **explicitly**
  ([admin.html:1406](admin.html), [1638](admin.html)), so it is unaffected by
  removing the global default.
- **Guard:** leave an inline comment where it's removed —
  *"Do NOT re-add `scroll-behavior: smooth` globally: it double-animates
  listing.js's per-frame snap-to-beat `scrollTo` (listing.js ~367/373)."*

### 2. Delete the dead project-grid `.card` / `.grid` block

**Why.** `.grid`, `.card`, `.card__media`, `.card__overlay`, `.card__title`,
`.card__type`, `.card__meta` and their hover/responsive rules
([styles.css:657](styles.css)–761) render on **no current page** — confirmed via
grep: those selectors appear only in `styles.css` and in old PRD/plan notes.
(`admin.html`'s `card`/`grid` are unrelated admin-tool classes; the live project
list is `.index__*`, the collage is `.mosaic__*`.)

- Remove the whole block, including its `@media (max-width: 980px)` /
  `(max-width: 640px)` `.grid` column rules and the `.card::after` hover ring.
- This also dissolves the only ungated `:hover` (sticky-hover-on-touch) concern in
  the review — it goes away with the dead code rather than needing a media-query
  gate.
- **Pre-flight:** re-grep `\.grid\b` / `\.card\b` (incl. `index-classic.html`,
  `project.html`, `projects.html`) immediately before deleting, to be certain.

### 3. Press feedback on the 4 icon/pill controls

**Why.** These are genuine pressable buttons but only animate border/background on
hover — no press response, unlike `.btn`/`.back-btn`. Add the site's existing
press language. Text links keep underline+colour (correctly off-pattern for
scale).

| Control | Selector | Where |
|---------|----------|-------|
| Preview close | `.mosaic-preview__close` | [styles.css:2733](styles.css) |
| Preview prev/next | `.mosaic-preview__nav` | [styles.css:2773](styles.css) |
| Per-tile sound badge | `.mosaic__sound` | [styles.css:2384](styles.css) |
| Universal sound toggle | `.mosaic-sound-toggle` | [styles.css:2450](styles.css) |

Spec (matches `.btn`):

```css
/* add transform to each control's existing transition list */
transition: …, transform 160ms var(--ease-out);
/* and: */
.mosaic-preview__close:active,
.mosaic-preview__nav:active,
.mosaic__sound:active,
.mosaic-sound-toggle:active { transform: scale(0.97); }
```

- `.mosaic-preview__nav` already carries `translateY(-50%)` for centring — its
  `:active` must be `transform: translateY(-50%) scale(0.97)` so the press doesn't
  drop it to the top edge.
- Each control's `prefers-reduced-motion` block already nulls its transitions;
  extend those blocks to also cover the new `transform` where one exists, so the
  press is instant (not removed — a 0ms scale is fine) under reduced motion.

### 4. Make the modal preview entrance perceptible

**Why.** `.mosaic-preview__stage` enters at `scale(0.985) → 1` — a 1.5% change is
imperceptible, so the open currently reads as a pure fade. Bump to a real (still
subtle) entrance. Modals correctly stay `transform-origin: center` (not anchored
to a trigger) — **keep that**.

- `transform: scale(0.95)` → `scale(1)`, existing 260ms `--ease-out` unchanged.
- Tune between 0.94–0.96 on device; 0.95 is the starting point.

### 5. Retune `[data-reveal]` — moderate tighten

**Why.** Currently 700ms on opacity + transform + `blur(6px)`, stagger delays up
to 320ms (last item lands ~1s after entering view). Animating `blur` across many
elements is also the main Safari paint cost. Keep the soft cinematic feel, land
snappier and cheaper.

| Property | Before | After (starting point) |
|----------|--------|------------------------|
| duration | 700ms | ~520ms |
| `filter` blur | `blur(6px)` | `blur(4px)` |
| `transform` | `translateY(28px)` | `translateY(20px)` |
| stagger delays | 80/160/240/320ms | 60/120/180/240ms |

- Easing stays `--ease-out`. Properties stay individually named (no `transition:
  all`).
- `[data-reveal].is-visible` resting state unchanged. Reduced-motion fallback
  unchanged.
- Final numbers eyeballed on-device.

### 6. Frame-rate-normalize the reel lerp

**Why.** `current += (target - current) * 0.12` ([script.js:765](script.js)) has
no `dt`, so the reel glides ~2× faster on a 120Hz display than on 60Hz.
`listing.js` already normalizes its own smoothing (`* 0.12 * dt`), so this also
makes the two consistent.

- Convert to a `dt`-based factor **anchored to the current 60Hz feel** so 60Hz is
  unchanged and only 120Hz stops over-gliding:

  ```js
  var k = 1 - Math.pow(1 - 0.12, dt / 16.667); // dt in ms; 60Hz → 0.12
  current += (target - current) * k;
  ```

- Requires a per-frame `dt` in `renderReel` (timestamp delta), clamped (e.g.
  `Math.min(dt, 50)`) so a stalled tab can't produce a huge jump on resume.
- The entrance sweep and the wrap/scale machinery ride the same `current`, so they
  inherit the fix with no separate change — verify the entrance sweep still reads
  right after the change.
- **Medium risk** flag is deliberate, given the de-jank history
  ([reach-v23-dejank-regression], [reach-safe-dejank-recipe]): see the A/B in
  Verification before committing.

## Scenarios / edge cases to honour

- **Listing snap-to-beat after #1** — with global smooth removed, listing.js's
  per-frame `scrollTo` writes land instantly; the snap glide should feel *cleaner*
  (only JS easing now), not jankier. Verify both scroll directions.
- **Admin smooth scroll** — `admin.html` still scrolls smoothly to its output;
  unaffected (explicit `behavior: 'smooth'`).
- **Preview nav button press** — `:active` scale composes with the `translateY(-50%)`
  centring; the button must not jump on press.
- **Reduced motion** — every retuned surface still honours its existing
  reduced-motion block; the new `:active` scales are instant (or absent) there.
- **Reel on 60Hz vs 120Hz after #6** — the glide should feel the *same* on both;
  60Hz feel must be unchanged from today.
- **Reel after a stalled tab** — clamped `dt` prevents a snap-jump when the rAF
  resumes.

## Out of scope

- Any change to the Void / The Reach, the Spotlight, the Glissando, or the
  living-Mosaic layers — all reviewed as already-good.
- Adding press feedback to text links (nav, footer) — underline+colour is the
  correct affordance there.
- Springs / physics rewrites — the existing lerp + WAAPI approach stays.
- New `CONTEXT.md` terms or any ADR (see Hard constraints).

## Verification

- **Listing (#1):** scroll the about-page scrub up and down; the snap-to-beat
  glides to a hold with no double-animation stutter; nothing else on the site that
  used to smooth-scroll is now broken (there was nothing — all `#` are SVG refs).
- **Dead CSS (#2):** every page (`index`, `projects`, `project`, `about`,
  `index-classic`) renders identically; grep confirms zero remaining `.grid`/
  `.card` references outside admin.
- **Press feedback (#3):** click-and-hold each of the 4 controls — each scales to
  0.97 and springs back; the preview nav button stays vertically centred while
  pressed.
- **Modal entrance (#4):** opening a tile preview shows a perceptible (subtle)
  scale-up from centre, not just a fade.
- **Reveal (#5):** scroll content into view — reveals land noticeably snappier;
  no visible blur-cost hitch on Safari; stagger still reads as a cascade.
- **Reel lerp (#6) — the A/B:** drive the home reel on a 60Hz and a 120Hz display
  (or DevTools rendering throttle); the glide/settle should feel identical, and
  the 60Hz feel must match today's. Check the entrance sweep still settles
  cleanly.
- **Reduced motion (all):** with `prefers-reduced-motion: reduce`, every changed
  surface degrades exactly as before.

## Naming → `CONTEXT.md`

Nothing to add — no new vocabulary in this pass (confirmed in grill).

## Open follow-ups (not in this pass)

- Lock the final eyeballed values for #4 (modal scale), #5 (reveal duration/blur/
  delays) once seen on a real device.
- Consider whether other scroll-driven surfaces (e.g. the Mosaic motion engine)
  carry the same frame-rate dependence as the reel did — audit separately if #6
  proves worthwhile.
