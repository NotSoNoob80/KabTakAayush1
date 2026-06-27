# PRD — Feel & Motion Polish Pass

## Problem Statement

A visitor moving through the site today encounters a handful of small motion
inconsistencies that, taken together, make the page feel slightly less
considered than the rest of the work suggests:

- On the Listing (about page), the scroll-snap to a **beat** sometimes
  micro-stutters, because the browser's global smooth-scroll is fighting the
  Listing's own per-frame scroll easing — two smoothing systems writing to one
  scroll position.
- Several genuine icon/pill buttons inside the Mosaic preview — the close, the
  prev/next, the per-tile sound badge, and the universal sound toggle — do not
  acknowledge a press. Everywhere else on the site, pressing a button feels
  like pressing a button; here it doesn't.
- Opening a tile preview reads as a pure fade because the entrance scale is too
  subtle (1.5%) to perceive — the modal "appears" rather than "opens".
- `[data-reveal]` content lands a beat slower than it needs to (700ms with a
  staggered cascade up to ~1s after entering view) and animates `blur` on many
  elements at once, which is the main paint cost on Safari.
- The home **reel** glides about twice as fast on a 120Hz display as it does on
  60Hz, because its lerp has no per-frame `dt` term — the feel of the same
  gesture is different on different machines.
- A large block of dead `.grid`/`.card` CSS still ships, including the only
  remaining ungated `:hover` rule on the site.

None of these are bugs the visitor would file. They are the difference between
"polished" and "really polished".

## Solution

A single, low-risk polish pass that closes the small set of remaining feel gaps
without touching any of the existing motion machinery (custom easing tokens,
`.btn`/`.back-btn` press + clip-path fill-sweep, origin-aware reveals, the
WAAPI Glissando, the `is-scrolling` sticky-hover fix, the SOLD stamp's
deliberately contrasting timing, every `prefers-reduced-motion` block). All six
tweaks ship together as one "feel & motion polish" change, on one branch:

1. Remove the global `scroll-behavior: smooth` rule so the Listing's
   snap-to-**beat** owns its motion cleanly. The Admin page's explicit
   `scrollIntoView({ behavior: 'smooth' })` calls are unaffected.
2. Delete the orphaned project-grid `.grid` / `.card` block (rendered on no
   live page), which also dissolves the file's only remaining ungated
   `:hover` rule.
3. Add the site's existing press language (`transform: scale(0.97)` on
   `:active`, 160ms `--ease-out`) to four Mosaic preview controls:
   `.mosaic-preview__close`, `.mosaic-preview__nav`, `.mosaic__sound`, and
   `.mosaic-sound-toggle`. Text links keep underline+colour and are
   intentionally out of scope.
4. Make the modal preview entrance perceptible: `scale(0.95) → 1` (from
   today's imperceptible `0.985 → 1`), same 260ms `--ease-out`, modal stays
   `transform-origin: center`.
5. Retune `[data-reveal]` — moderate tighten: ~520ms duration (from 700ms),
   `blur(4px)` (from 6px), `translateY(20px)` (from 28px), stagger
   60/120/180/240ms (from 80/160/240/320ms). Easing, resting state, and
   reduced-motion fallback unchanged.
6. Frame-rate-normalize the reel lerp in `renderReel` so the glide feels
   identical on 60Hz and 120Hz, anchored to today's 60Hz feel
   (`k = 1 - Math.pow(1 - 0.12, dt / 16.667)`), with `dt` clamped (~50ms) so a
   stalled tab does not snap-jump on resume.

No new vocabulary (`CONTEXT.md` untouched), no ADR (none of the six clears
that bar; the one trap-worthy decision in #1 is guarded by an inline code
comment instead), transform/opacity-only consistent with the rest of the site,
and every retuned surface keeps its existing `prefers-reduced-motion`
fallback intact. Final visual numbers (modal entrance scale, reveal duration /
blur / delays) are eyeballed on-device — the values above are starting points.

## User Stories

1. As a visitor scrolling the Listing on the about page, I want the
   snap-to-**beat** to glide and settle cleanly with no micro-stutter, so that
   the scroll-scrub reads as one motion system, not two fighting each other.
2. As a visitor scrolling the Listing in either direction, I want the snap to
   feel the same up as it does down, so the page does not surprise me on
   reverse.
3. As a visitor of the Admin page, I want the existing smooth scroll to its
   output to continue working, so that an unrelated tool I depend on does not
   regress as a side-effect of this pass.
4. As a visitor on any page (`index`, `projects`, `project`, `about`,
   `index-classic`), I want the page to render identically after dead CSS is
   removed, so that "cleanup" never means "something I used to see is gone".
5. As a visitor on a touch device, I want no ungated `:hover` to ever latch on
   after a tap, so that the page never looks "stuck" on what I last touched.
6. As a visitor opening a Mosaic preview and pressing the close button, I want
   the button to acknowledge my press with a small scale-down and spring back,
   so that the control feels like a button and not a label.
7. As a visitor stepping through preview images, I want the prev/next button to
   acknowledge my press, *and* to stay vertically centred during the press, so
   that the press does not visibly jump the button to the top edge.
8. As a visitor toggling sound on a single tile, I want the per-tile sound
   badge to acknowledge my press the same way every other button on the site
   does, so the affordance is consistent.
9. As a visitor toggling sound on the whole project, I want the universal sound
   toggle to acknowledge my press the same way, so I trust I actually hit it.
10. As a text-link clicker (nav links, footer links), I want my links to keep
    using underline+colour as their press affordance — *not* a scale — so the
    site does not break its own typographic convention.
11. As a visitor opening a Mosaic preview, I want the preview to clearly
    *open*, not just fade in, so that the entrance reads as an event rather
    than a swap.
12. As a visitor opening a preview on a desktop, I want the open animation to
    scale up from the centre of the screen (and *not* anchor to wherever I
    clicked), so the modal reads as a modal — a centred surface — rather than
    a region pop-out.
13. As a visitor scrolling content into view, I want reveals to land a beat
    sooner than they do today, so the page feels responsive instead of
    "loading in".
14. As a visitor scrolling a long Mosaic on Safari, I want no paint hitch from
    many simultaneous blur reveals, so the scroll stays smooth.
15. As a visitor scrolling a stack of items into view, I want the stagger to
    still read as a cascade (not as everything appearing at once), so the
    rhythm of the page is preserved.
16. As a visitor on a 120Hz laptop or phone, I want the home reel glide to feel
    the same as it does on a 60Hz screen, so the same wheel-flick reads as the
    same motion regardless of hardware.
17. As a visitor on a 60Hz screen today, I want the reel glide to feel exactly
    like it does today after the fix, so familiar feel is not silently
    retuned.
18. As a visitor returning to a backgrounded tab, I want the reel not to
    snap-jump when the tab resumes, so the first frame back is calm.
19. As a visitor whose system requests reduced motion, I want every changed
    surface to degrade exactly as before — reveals static, modal entrance
    without scale, no press scale (or instant) — so the accessibility
    contract is preserved.
20. As a visitor of any reviewed-and-good area (Void, The Reach, Spotlight,
    Glissando, living Mosaic), I want those surfaces unchanged, so this pass
    cannot regress them.
21. As a visitor of the SOLD stamp, I want its deliberately contrasting
    `--ease-in-out` snap unchanged, so its intentional impact is preserved.

## Implementation Decisions

- **One branch, one change.** All six tweaks ship together as a single
  "feel & motion polish" branch, not split per-area.
- **CSS-only for #1–#5; JS-only for #6.** No markup changes. No new modules,
  no new exports, no new public seams.
- **#1 — Remove global `scroll-behavior: smooth`.** The rule lives on the root
  `html` selector in `styles.css`. Nothing in the markup navigates by in-page
  anchor — every `href="#…"` is an SVG `<use>` reference — so removing the
  global default loses nothing. The Listing's `window.scrollTo(0, newY)`
  per-frame writes in `listing.js` will land instantly without the browser
  trying to re-animate to each one. `admin.html` keeps its explicit
  `scrollIntoView({ behavior: 'smooth' })` calls and is unaffected. **Guard:**
  leave an inline CSS comment at the removal site reading roughly *"Do NOT
  re-add `scroll-behavior: smooth` globally: it double-animates listing.js's
  per-frame snap-to-beat `scrollTo`."*
- **#2 — Delete the dead project-grid CSS block.** Remove `.grid`, `.card`,
  `.card__media`, `.card__overlay`, `.card__title`, `.card__type`,
  `.card__meta`, their hover/responsive rules, the `@media (max-width: 980px)`
  and `(max-width: 640px)` column rules, and the `.card::after` hover ring.
  The `admin.html` `card`/`grid` classes are unrelated admin-tool selectors
  and stay. **Pre-flight:** re-grep `\.grid\b` / `\.card\b` across
  `index-classic.html`, `project.html`, `projects.html` immediately before
  deletion to confirm zero live references.
- **#3 — Press feedback on four Mosaic preview controls.** Add `transform` to
  each control's existing `transition` list (160ms `--ease-out`) and a
  `:active { transform: scale(0.97); }` rule, matching `.btn`/`.back-btn`. For
  `.mosaic-preview__nav` the `:active` must compose its existing
  `translateY(-50%)` centring, so the press rule is
  `transform: translateY(-50%) scale(0.97)` — otherwise the press drops the
  button to the top edge. Each control's existing `prefers-reduced-motion`
  block is extended to also cover the new `transform`, so the press is
  instant under reduced motion (a 0ms scale is fine — the affordance is not
  removed).
- **#4 — Modal preview entrance.** Change `.mosaic-preview__stage` from
  `scale(0.985) → 1` to `scale(0.95) → 1`. Keep the existing 260ms
  `--ease-out`. Keep `transform-origin: center` (modals correctly stay
  centred rather than anchoring to a trigger). Tune between 0.94–0.96
  on-device; 0.95 is the starting point.
- **#5 — `[data-reveal]` retune (moderate).** Duration 700ms → ~520ms,
  `filter: blur(6px)` → `blur(4px)`, `transform: translateY(28px)` →
  `translateY(20px)`, stagger delays 80/160/240/320ms → 60/120/180/240ms.
  Easing stays `--ease-out`. Properties stay individually named (no
  `transition: all`). `[data-reveal].is-visible` resting state unchanged.
  Reduced-motion fallback unchanged. Final numbers eyeballed on-device.
- **#6 — Frame-rate-normalize the reel lerp.** Replace the constant smoothing
  factor in `renderReel` with a `dt`-anchored factor that reproduces today's
  60Hz feel exactly:

  ```js
  // dt = ms elapsed since previous frame; anchored so 60Hz (16.667ms) → 0.12
  var k = 1 - Math.pow(1 - 0.12, dt / 16.667);
  current += (target - current) * k;
  ```

  Compute `dt` from the rAF timestamp delta and clamp it (e.g.
  `Math.min(dt, 50)`) so a stalled tab cannot produce a single huge jump on
  resume. The entrance sweep and the wrap/scale machinery ride the same
  `current`, so they inherit the fix without separate changes — the entrance
  sweep must still read right after the change. This also brings the reel in
  line with `listing.js`, which already normalizes its own smoothing.
- **No new `CONTEXT.md` vocabulary, no new ADR.** None of the six clears the
  ADR bar; the one trap-worthy decision (#1's global removal) is documented
  by an inline code comment, not a formal ADR.
- **Transform/opacity only.** No new paint-heavy properties introduced; #5
  *reduces* paint cost.

## Testing Decisions

These changes are perceptual and frame-rate dependent — automated tests are
not the right tool. A good test here means **observing the actual rendered
behavior in a browser at the right device frame rate, with and without
reduced motion**, not asserting on a stylesheet property or a JS constant.
Asserting that `scroll-behavior: smooth` is no longer in the stylesheet would
pass without proving the Listing's snap-to-beat is actually cleaner — which
is the thing that matters.

- **Listing snap-to-beat (#1).** Scroll the about page scrub up and down on a
  real device. The snap-to-beat glides to a hold with no double-animation
  micro-stutter. Verify both scroll directions.
- **No regression of explicit smooth-scroll callers (#1).** Open
  `admin.html`, trigger its smooth `scrollIntoView` paths
  (~`admin.html:1406`, ~`1638`) and confirm they still scroll smoothly.
- **Dead CSS (#2).** Visually compare `index`, `projects`, `project`,
  `about`, `index-classic` before/after — they must render identically.
  Grep confirms zero remaining `.grid` / `.card` references outside the
  unrelated `admin.html` selectors.
- **Press feedback (#3).** Click-and-hold each of the four controls in turn.
  Each scales to 0.97 and springs back. The preview nav button stays
  vertically centred during the press (the composed `translateY(-50%)
  scale(0.97)` is the proof point).
- **Modal entrance (#4).** Opening a tile preview shows a perceptible (still
  subtle) scale-up from centre — no longer reads as a pure fade. Tune scale
  on-device between 0.94–0.96.
- **Reveal retune (#5).** Scroll content into view: reveals land noticeably
  snappier; no visible blur-cost hitch on Safari; the stagger still reads as
  a cascade (not as a single simultaneous appearance).
- **Reel lerp A/B (#6).** Drive the home reel on a 60Hz and a 120Hz display
  (or DevTools rendering throttle). The glide/settle feels identical between
  the two. The 60Hz feel matches today's 60Hz feel. The entrance sweep
  still settles cleanly. Background the tab for 10s, return, and confirm no
  snap-jump on the first frame back (clamped `dt`).
- **Reduced motion (all).** With `prefers-reduced-motion: reduce`, every
  changed surface degrades exactly as it did before: reveals static, modal
  enters without scale, presses are instant (or no scale).

**Prior art for this kind of test.** The site's `prefers-reduced-motion`
fallbacks are already verified by visual inspection (no test framework drives
them); the existing Mosaic / Spotlight / Glissando changes were verified by
on-device demonstration rather than automated assertions. This pass follows
the same precedent — verification is by visit, not by suite.

## Out of Scope

- Any change to the Void, The Reach, the Spotlight, the Glissando, or the
  living-Mosaic layers (Frame drift / Tile settle / Gate shear) — all
  reviewed and already-good.
- Adding press feedback to text links (nav, footer) — underline+colour is the
  correct affordance for text links.
- Springs / physics rewrites — the existing lerp + WAAPI approach stays.
- New `CONTEXT.md` vocabulary or any ADR.
- The custom easing tokens, `.btn`/`.back-btn` press + clip-path fill-sweep,
  origin-aware reveals (preview circle-clip, easter-toast top-left,
  footer char bottom-center), the `is-scrolling` → `pointer-events: none`
  sticky-hover fix, and the SOLD stamp's deliberately contrasting timing —
  all explicitly preserved.
- Splitting the six tweaks across multiple branches or PRs.
- Auditing other scroll-driven surfaces (e.g. the Mosaic motion engine) for
  the same frame-rate dependence as the reel. Tracked as a follow-up if #6
  proves worthwhile.

## Further Notes

- **De-jank history (#6 only).** The reel lerp change carries a medium-risk
  flag deliberately, given prior attempts at de-jank (the Reach v23
  regression that had to be rolled back to v22). The dt-anchored formula is
  chosen specifically so 60Hz behavior is mathematically unchanged from
  today; only 120Hz stops over-gliding. The A/B test in the Testing section
  is the gate before committing.
- **Open follow-ups** (not in this pass): lock the final eyeballed values for
  #4 (modal scale) and #5 (reveal duration / blur / delays) once seen on a
  real device; audit other scroll-driven surfaces for frame-rate dependence
  if #6 proves out.
- **Source of truth.** The full plan with file/line references, the "what we
  are NOT touching" list, hard constraints, scenario walk-throughs, and
  verification steps lives in `plan-feel-polish.md` and is the canonical
  reference for implementers.
