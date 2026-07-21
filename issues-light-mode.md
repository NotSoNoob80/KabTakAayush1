# Issues — Light mode: "ink & gold on paper"

- **Source PRD**: [PRD-light-mode.md](PRD-light-mode.md) — the *why* and the *what*
- **Canonical plan**: [plan-light-mode.md](plan-light-mode.md) — phase order, exact token
  values, file/line references, verification protocol. **Every slice below defers to the
  plan for the *where*.**
- **Decisions**: [ADR 0015](docs/adr/0015-two-static-themes-retire-the-hour.md)
- **Vocabulary**: [CONTEXT.md](CONTEXT.md)
- **Produced by**: `to-issues` (tracer-bullet vertical slices), 2026-07-21

No issue tracker is configured for this repo, so these are file-based issues. Cross-slice
blocking is by slice number.

## Slice index

| # | Title | Type | Blocked by | Status |
| --- | --- | --- | --- | --- |
| 1 | [Contrast checker + validated palette](#slice-1--contrast-checker--validated-palette) | AFK | None | DONE |
| 2 | [The theme spine — tokens, resolver, `KTA.theme`, the toggle](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle) | AFK | 1 | DONE |
| 3 | [Delete the Hour](#slice-3--delete-the-hour) | AFK | 2 | DONE |
| 4 | [The bulb](#slice-4--the-bulb) | AFK | 2 | DONE |
| 5 | [The light Void](#slice-5--the-light-void) | AFK | 3 | DONE |
| 6 | [Void nav always visible + soft scrim](#slice-6--void-nav-always-visible--soft-scrim) | AFK | 2 | DONE |
| 7 | [Projects index sweep](#slice-7--projects-index-sweep) | AFK | 2 | DONE |
| 8 | [Mosaic + Spotlight sweep](#slice-8--mosaic--spotlight-sweep) | AFK | 2 | DONE |
| 9 | [Listing sweep](#slice-9--listing-sweep) | AFK | 2 | DONE |
| 10 | [Shared chrome sweep](#slice-10--shared-chrome-sweep) | AFK | 2 | DONE |
| 11 | [Admin sweep + toggle](#slice-11--admin-sweep--toggle) | AFK | 2 | DONE |
| 12 | [Verification gate](#slice-12--verification-gate) | HITL | 1–11 | **OPEN — owner pass** |

## Execution record (2026-07-21)

Slices 1–11 implemented and verified on `localhost:8123`. New files: `theme.js`,
`tools/contrast-check.ps1`. Deleted: `hour-tint.js`.

**Three decisions changed during execution**, each because the computation
disagreed with the plan:

1. **Light `--accent` darkened `#8a6a1f` → `#7a5d15`.** The planned value clears
   the text bar on paper (4.71:1) but not on the raised surface (4.33:1), which
   is where gold labels actually sit. `#8a6a1f` was demoted to `--accent-dim`.
2. **Nav scrim top stop raised `.55` → `.65`.** At `.55`, dark-theme nav type over
   a blown-out white frame is 3.79:1. `.60` lands exactly on 4.50 with no margin.
3. **No drop-shadow on the Listing cards in light.** `clip-path` clips
   `box-shadow` — the card's existing shadow is already painted and discarded in
   both themes. Only `filter: drop-shadow()` survives a clip-path, and both the
   card and its stage have transforms rewritten every frame by the scrub. The
   hairline edge shipped; the shadow did not, rather than hang a filter on a
   per-frame-animated element.

**One thing the plan did not anticipate:** the Listing cards were *already* cream
paper with black ink in the dark theme. They are theme-invariant "paper islands"
and now pin their own token values, so they render identically in both themes —
which is also what keeps the dark theme unchanged. The SOLD stamp's dark plate
pins separately, or the light theme would have put brand gold back on near-white
at 1.96:1, the exact failure that plate exists to fix.

**Post-implementation change (owner, 2026-07-21).** The theme toggle became a
sun/moon glyph instead of the destination-labelled LIGHT / DARK text control the
PRD specified. Which glyph is visible is decided in CSS off `data-theme` rather
than in script, so it cannot flash the wrong icon before `theme.js` runs and
stays correct with JS disabled; `theme.js` sets only `aria-label` / `title`, and
no longer writes `textContent` (which would have deleted the inline SVGs). The
control keeps no underline sweep — hover shifts to `--accent` instead. Verified
across all 5 pages × both themes: exactly one glyph visible in every case, never
both, never neither. `CONTEXT.md`, `PRD-light-mode.md` and `plan-light-mode.md`
were amended; ADR 0015 needed no change, as it decides 2-state vs 3-state and
never specified the control's form. PRD user story 9 ("looks and behaves like
the nav links beside it") is superseded and marked as such.

**Environment limits (see slice 12).** The preview tab never reports
`document.visibilityState === 'visible'`, so the document timeline never advances:
screenshots time out and no animation can be observed playing. The bulb was
verified by driving its curve directly, the same technique the animation plans
used. Separately, the OS-preference emulation updates `matchMedia().matches`
without dispatching `change` — confirmed with an independent listener that
recorded zero events — so instant live-follow could not be exercised here.
A `visibilitychange` / `pageshow` catch-up was added so a missed event self-heals,
and that path *is* verified.

Slices 6–11 depend only on the spine and are parallel-grabbable — they do not block each
other. Slice 3 blocks the Void work but no sweep.

---

## Slice 1 — Contrast checker + validated palette

- **Type**: AFK
- **Blocked by**: None — can start immediately
- **User stories covered**: 26, 27, 28, 29

### What to build

A tiny, dependency-free contrast-ratio script, plus the dark and light token value tables
run through it. This lands *before* anything consumes the palette so a failing value is
corrected once, in one place, rather than after a site-wide sweep has hardened around it.

The checker takes pairs of colour values and a required ratio and reports the computed
ratio. It deliberately does not parse the stylesheet or assert on selectors, so it
survives any refactor of how the tokens are organised. It must not grow into a test
framework — no runner, no dependencies.

Pairs checked, per theme: ink on ground; muted on ground; accent on ground; accent on
raised surface; ink label on the bright gold fill. The nav scrim composite pair
(slice 6) and any pair a later sweep introduces are appended to the table as those
slices land.

### Acceptance criteria

- [ ] A standalone script computes WCAG contrast ratios from colour values, with zero
      dependencies and no test runner
- [ ] Both themes' token pairs are declared in one table and printed with computed ratios
- [ ] All text pairs clear 4.5:1 and all UI/graphical pairs clear 3:1; the nav's 12px
      letterspaced type is asserted at the text bar with **no large-text exemption**
- [ ] Any value from the plan that fails is adjusted (hue kept, value shifted) and the
      corrected value is written back into the plan's token table
- [ ] The script exits non-zero when a pair is under bar

### Blocked by

None — can start immediately.

---

## Slice 2 — The theme spine — tokens, resolver, `KTA.theme`, the toggle

- **Type**: AFK
- **Blocked by**: [Slice 1](#slice-1--contrast-checker--validated-palette)
- **User stories covered**: 1–15, 17, 31, 32, 55

### What to build

The whole end-to-end path from a visitor's OS preference to a correctly painted page with
a working control — landing as one piece, because a half-landed spine leaves the site
visibly broken.

- A **semantic token layer** (`--bg`, `--bg-deep`, `--surface`, `--ink`, `--muted`,
  `--accent`, `--accent-dim`, `--accent-fill`, `--line`) with the existing primitives kept
  as the dark theme's values. `--gold` stays defined as an alias of `--accent` — JS and
  inline fallbacks reference it by name, and aliasing avoids a wide rename the CSS sweep
  does not cover. Channel-triplet tokens (`--ink-rgb`, `--bg-rgb`) ship alongside so the
  roughly thirty hardcoded `rgba(…)` values can be expressed as `rgba(var(--bg-rgb), …)`
  and theme automatically.
- **Themes are selected by `data-theme` on `<html>`.** Dark is `:root`'s default, so it is
  also the no-JS and pre-script state; light is a `html[data-theme="light"]` override,
  mirrored inside a `@media (prefers-color-scheme: light) html:not([data-theme])` rule
  purely as the no-JS fallback.
- An **inline `<head>` resolver before the stylesheet**, duplicated into every live page.
  Duplication is deliberate: an external script cannot be guaranteed to run before first
  paint, and no-FOUC is a hard constraint. Wrapped so a `localStorage` throw degrades to
  the OS preference rather than breaking the page.
- **`theme.js`**, shared across all live pages, exposing `KTA.theme` with `current()`,
  `set(theme, { source })`, and `subscribe(fn)`. The API deliberately mirrors the retired
  `KTA.hourTint` — `subscribe` fires immediately on registration, returns an unsubscribe
  function, and a listener throw never breaks the page — so the Void's wiring stays a
  one-liner and slice 3 is a swap, not a redesign. `KTA.theme` is the **single writer** of
  `data-theme` after first paint.
- **The theme toggle**: a real `<button>` reset to text-link appearance, as the last item
  in the nav links on every live page including the Admin. Visible label and `aria-label`
  both name the *destination* theme and both update on every theme change, including one
  that did not originate from the button.
- `<meta name="theme-color">` on every page with both `media`-attributed variants for
  first paint, updated on switch.

The swap is instant in this slice — the bulb is [slice 4](#slice-4--the-bulb).
`index-classic.html` is orphaned (zero inbound references) and is deliberately skipped.

Resolution order is: stored explicit choice → OS preference (followed live) → dark. The
`matchMedia` change listener is a no-op once a choice is stored.

### Acceptance criteria

- [ ] Every existing consumer of `--black` / `--cream` / `--gold` in the shared stylesheet
      is re-pointed to a semantic token; `--gold` still resolves for JS and inline callers
- [ ] The hardcoded `rgba(…)` audit list from the plan is expressed through channel
      triplets and themes automatically
- [ ] First paint matches the OS preference on **every** live page with no flash of the
      other ground, on a fresh profile with no stored key
- [ ] With JavaScript blocked, the OS preference is still respected; with JS blocked and
      no preference expressed, the page is the dark theme it ships today
- [ ] The toggle is present in the nav on every live page, is reachable by Tab, activates
      with Enter and Space, and announces its destination theme before and after use
      (shipped as a sun/moon glyph rather than a text label — owner change, 2026-07-21;
      the glyph shows the current theme, the accessible name still names the action)
- [ ] One tap persists the choice; it survives reload, return visit, and a later OS change
- [ ] A visitor who has never toggled re-themes **live** when the OS flips with the tab
      still open
- [ ] With `localStorage` throwing, the toggle still switches the current page and nothing
      throws to the console
- [ ] `theme-color` matches the active theme at first paint and after a switch
- [ ] The dark theme is pixel-identical to today's site

### Blocked by

- [Slice 1](#slice-1--contrast-checker--validated-palette) — the palette values must be
  proven before the sweep hardens around them.

---

## Slice 3 — Delete the Hour

- **Type**: AFK
- **Blocked by**: [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)
- **User stories covered**: 31, 58

### What to build

The Hour is removed entirely rather than left dormant behind a flag — script, script tags,
CSS fallback chain, and the Void's subscribe hook. Git history is the archive. Its one hard
rule survives and is inherited by the theme: *the theme grades only the room around the
work — never a photographic pixel*.

- `hour-tint.js` and all of its script tags are deleted.
- The `body` background's `var(--hour-tint, …)` fallback chain becomes a plain `var(--bg)`.
- The `prefers-contrast: more` rule is rewritten to pin **each theme to its own** neutral
  ground — pure `--black` in dark, pure paper in light — rather than forcing `--black`.
- The Void's `KTA.hourTint.subscribe` block is replaced by a `KTA.theme.subscribe` that
  swaps `scene.background` and `scene.fog.color`; the scene's single background-colour
  constant becomes a per-theme pair.
- The stale settled-decisions reference in `plans/README.md` is corrected. CONTEXT.md and
  ADR 0015 are already updated.

### Acceptance criteria

- [ ] No reference to the Hour remains in any live page, script, or stylesheet — no
      dormant flag, no disabled block
- [ ] The Void's clear colour and fog now follow `KTA.theme` and change when the theme does
- [ ] `prefers-contrast: more` pins the neutral ground correctly in **both** themes
- [ ] `plans/README.md` no longer states the Hour as a live settled decision
- [ ] No photographic pixel is graded in either theme

### Blocked by

- [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle) — `--bg` and
  `KTA.theme.subscribe` must exist before the Hour's consumers can be repointed.

---

## Slice 4 — The bulb

- **Type**: AFK (the feel judgment is deferred to
  [slice 12](#slice-12--verification-gate))
- **Blocked by**: [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)
- **User stories covered**: 18–25

### What to build

The switch itself, deliberately asymmetric like a real tungsten fixture.

**Dark→light**: tokens swap instantly, then a full-viewport overlay filled with the
*outgoing* dark ground plays an opacity flicker-out — roughly three soft dips over well
under a second, with deliberately uneven keyframe spacing and linear easing between dips
(a filament stutters; it does not glide). The first moments of the curve tint the overlay
warm for the tungsten warm-up.

**Light→dark**: instant token swap, with at most a single very short dark fade as the
"snap". No flicker — a flicker on the way *down* would read as a bug.

The overlay is `pointer-events: none` and sits above the grain layer, so the page stays
fully interactive and one element covers the whole surface including the WebGL canvas.
That single overlay is also the **seam-cover** for the Void's clear-colour swap: the canvas
changes underneath it, so there is no visible two-step.

**Photosensitivity is a hard constraint, not a tuning parameter.** The pulses are soft
luminance dips in a single opacity channel, never a hard black/white alternation, and stay
far under the three-flashes-per-second general threshold. This is the reason the effect is
an opacity curve on one overlay rather than a background alternation. Pulse count, spacing,
warmth, and duration are tunable by eye; that constraint is not.

The overlay passes over photographs for well under a second and leaves nothing behind —
a *transition*, not a grade, the same category as the Cover morph.

### Acceptance criteria

- [ ] Dark→light plays a countable number of soft pulses once, under a second, warm at the
      top of the curve
- [ ] Light→dark is instant, with no flicker in either the overlay or the tokens
- [ ] The page stays fully interactive throughout — a click during the transition lands
- [ ] Two rapid taps resolve cleanly to the theme actually chosen, with no stuck overlay
      and no half-lit page
- [ ] Under `prefers-reduced-motion` there is no overlay at all and both directions are an
      instant clean swap
- [ ] The luminance curve never alternates hard black/white and stays far under the
      three-flashes-per-second threshold
- [ ] On the Void, the WebGL space and the page chrome change as one event — the canvas
      and the nav never disagree about which theme it is
- [ ] Photographs are unaltered once the transition completes

### Blocked by

- [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle) — the bulb runs
  from `set(theme, { source })` and needs an explicit-toggle source to distinguish it from
  a live OS change.

---

## Slice 5 — The light Void

- **Type**: AFK
- **Blocked by**: [Slice 3](#slice-3--delete-the-hour)
- **User stories covered**: 33–42

### What to build

The homepage is not a page with a background; it is a WebGL field with a clear colour, fog,
a loader, a reticle, a hint line, and a shutter-drag shader. None of it themes for free.
This slice makes the whole Void a theme consumer — space, chrome, and Reach UI together —
so the surface is never half-lit.

- **Space**: the background-colour constant becomes a dark/light pair; light is a
  paper-white that is total but not blinding. Fog density may need a per-theme nudge,
  because depth reads differently against a bright ground.
- **Loader**: background, progress track, and count all themed, so the very first thing a
  visitor sees is already the right theme.
- **Centre logo**: the current dark drop shadow reads as a hole on paper — light mode gets
  a soft warm shadow or none. Whether the logo asset itself holds against paper is a live
  check; a light-variant asset is the fallback if the gold letters don't.
- **Grain**: the overlay's blend mode and opacity were tuned against near-black and become
  per-theme values, so the grain still reads as texture rather than as noise or as nothing.
- **Shutter drag**: the motion smear runs in **both** themes; the **light-trails** term is
  gated to the dark theme, because a lighten-only pass cannot read against a bright ground
  and would only wash the frames out.
- **The Reach UI**: the reticle, its clutch ring, the on-canvas hint, and the Reach CTA
  follow `--accent` so they stay visible on paper. The **camera-active indicator** stays
  clearly visible red — its job is privacy honesty and it must never be the thing that
  fades.
- **The frames' `ShaderMaterial` is intentionally untouched** — the same boundary the Hour
  held. Only frame edges and mounts, if gold-tinted, follow `--accent`.

No change to the Void's intro, chase, One-Euro smoothing, or frame-aligned detection
architecture. This is a palette change on hard-won de-jank work; do not disturb it.

### Acceptance criteria

- [ ] The light Void renders as paper-white space — total, but not blinding — with fog and
      depth falloff still communicating distance
- [ ] The loading sequence is themed from the first frame in both themes
- [ ] The centre logo reads as printed on the page, not punched out of it, with no dark halo
- [ ] Grain reads as texture on both grounds
- [ ] Shutter drag's motion smear plays in both themes; light-trails are **absent in light**
      and **present in dark**
- [ ] Reticle, clutch ring, and hint stay legible in light mode
- [ ] The camera-active indicator is unmistakably red against paper
- [ ] Frames render identically in both themes — the frame shader is untouched
- [ ] The Void's motion architecture is unchanged; existing reduced-motion paths still fire

### Blocked by

- [Slice 3](#slice-3--delete-the-hour) — the Void must be subscribed to `KTA.theme` and off
  the Hour before its per-theme constants land.

---

## Slice 6 — Void nav always visible + soft scrim

- **Type**: AFK
- **Blocked by**: [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)
- **User stories covered**: 16, 43, 44, 45, 46

### What to build

The desktop peek is deleted outright — both the transform-based hidden state and the
pointer-near-top handler, plus its class-cleanup wiring. The header stops reacting to a
gesture nobody intended, and the nav (with the theme toggle in it) is reachable on the Void
without first discovering a hidden behaviour.

The Void nav's transparent background is replaced by a **soft short scrim**: the site nav's
gradient at roughly half opacity, no blur. Mobile keeps its existing always-visible
behaviour and gains the same scrim, so mobile and desktop finally behave identically here.
The site-wide nav gradient becomes token-based so it themes everywhere.

The scrim's effective composite against a worst-case bright frame is added to slice 1's
contrast table.

### Acceptance criteria

- [ ] The nav is visible on Void load without any pointer movement, on desktop and mobile
- [ ] No peek behaviour remains — no hidden transform state, no pointer-near-top handler,
      no leftover class wiring
- [ ] The scrim is present in both themes and is a gradient at half opacity with no blur
- [ ] Nav type stays legible with a bright frame drifting directly behind it, verified as a
      composite ratio in the contrast table, not by eye alone
- [ ] The site-wide nav gradient themes correctly on every page

### Blocked by

- [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle) — the scrim is
  expressed through the channel-triplet tokens.

---

## Slice 7 — Projects index sweep

- **Type**: AFK
- **Blocked by**: [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)
- **User stories covered**: 47, 48

### What to build

Frame numbers, meta lines, and underline sweeps on the Projects index move to semantic
tokens so the whole row reads as one designed object in either theme. The gold underline's
hover state is ochre in light and must be verified against the paper ground.

The grayscale→colour bloom of an inline thumbnail is theme-neutral and works identically in
both themes — the contact-sheet reveal is about the photograph, not about the room.

### Acceptance criteria

- [ ] Frame numbers, meta lines, and underline sweeps are token-driven and correct in both
      themes
- [ ] The gold underline's hover state clears its contrast bar on paper
- [ ] The thumbnail bloom is byte-identical in behaviour across themes and is not
      re-graded by the theme
- [ ] The index row cascade and all existing reduced-motion paths are untouched

### Blocked by

- [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)

---

## Slice 8 — Mosaic + Spotlight sweep

- **Type**: AFK
- **Blocked by**: [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)
- **User stories covered**: 49, 50, 51

### What to build

The project page in both themes, with the images shown exactly as they are today.

The mount's dim-gold hairline and its full-gold lit state follow `--accent-dim` and
`--accent`, with the light values verified against paper, so the now-playing mark on the
lit film still reads clearly as "on".

**The signal-inversion risk is the load-bearing part of this slice**: resting films are
dimmed by opacity, and dimming by opacity reads *lighter* on paper. Confirm the dimmed
state still reads as "off" in light mode, and correct it if the signal inverts.

The sound badge and the back button's gold sweep use `--accent-fill` — bright brand gold
with dark ink as the label colour in **both** themes, so the brand's loud moments stay loud
and the label on them stays legible.

Mosaic images and the living Mosaic's reactions are untouched.

### Acceptance criteria

- [ ] The mount reads clearly as "on" against paper
- [ ] Dimmed resting films still read as "off" in light mode — the signal does not invert
- [ ] Large gold fills keep the bright brand gold with a dark ink label clearing 4.5:1 in
      both themes
- [ ] Mosaic images and videos render identically in both themes
- [ ] The Spotlight handoff, the living Mosaic's three reactions, and every existing
      reduced-motion path are unchanged

### Blocked by

- [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)

---

## Slice 9 — Listing sweep

- **Type**: AFK
- **Blocked by**: [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)
- **User stories covered**: 30, 52

### What to build

A cream card on a paper ground has no edge — the classifieds cards would vanish into the
page now that both are pale. In **light only**, cards gain a hairline border and a soft
paper shadow so they still read as separate clippings. Card ink and illustrations are
already dark and are mostly free.

The scroll-scrub, the beats, and every card state behave exactly as they do in dark mode.
The theme changes the palette and nothing about the choreography.

### Acceptance criteria

- [ ] Cards read as distinct clippings against the paper ground in light mode
- [ ] The hairline and shadow apply in light only — dark mode is unchanged
- [ ] The scroll-scrub, the beats, and every card state are behaviourally identical across
      themes
- [ ] The About scrub's existing reduced-motion path is untouched

### Blocked by

- [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)

---

## Slice 10 — Shared chrome sweep

- **Type**: AFK
- **Blocked by**: [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)
- **User stories covered**: 53, 54

### What to build

The remaining shared surfaces move to tokens: the footer wordmark, buttons, the secret-egg
toast, and scrollbars if styled. Even the hidden surfaces are finished.

**The footer wordmark's per-letter press and the touch Glissando are a settled taste
decision** (the 460ms spring both ways, owner-confirmed). This slice re-colours them and
changes nothing about their timing or feel — do not quietly re-tune a settled decision
under cover of theme work.

### Acceptance criteria

- [ ] Footer wordmark, buttons, secret-egg toast, and scrollbars are token-driven and
      correct in both themes
- [ ] The per-letter press and the Glissando look and feel exactly as they do today — same
      timings, same spring
- [ ] The secret egg's toast is legible in both themes

### Blocked by

- [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)

---

## Slice 11 — Admin sweep + toggle

- **Type**: AFK
- **Blocked by**: [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)
- **User stories covered**: 17

### What to build

The Admin gets the same token sweep of its hardcoded values, so the owner's private tool is
not the one dark rectangle left on a light machine. The toggle already landed in its header
in slice 2; this slice makes the surface behind it actually themed.

Because the Admin is private, it is held to **functional QA only** — not the full contrast
protocol, and not a full accessibility pass.

### Acceptance criteria

- [ ] Every hardcoded colour value in the Admin is token-driven
- [ ] The Admin renders correctly and is fully usable in both themes
- [ ] The toggle in the Admin header works and persists like it does everywhere else
- [ ] No console errors in either theme

### Blocked by

- [Slice 2](#slice-2--the-theme-spine--tokens-resolver-ktatheme-the-toggle)

---

## Slice 12 — Verification gate

- **Type**: HITL
- **Blocked by**: Slices 1–11
- **User stories covered**: 55, 56, 57 (and confirms every story above)

### What to build

The full verification pass, ending in the owner's on-device call. Verification here is by
visit, not by suite — the same precedent set by `PRD-feel-polish.md` and by every Mosaic /
Spotlight / Glissando change before it. Asserting that a custom property holds a particular
hex value tests the stylesheet back to itself and proves nothing.

**Automated**: the contrast table from slice 1, now complete — including the nav scrim
composite and the gold-fill label pairs — all text ≥4.5:1 and all UI ≥3:1.

**Browser pass** against the static server:

- **First paint**: emulate `prefers-color-scheme` both ways, no stored key, and load every
  live page. The painted theme must match the emulated OS preference with **no flash**.
  Checked per page, because the resolver is duplicated per page.
- **Toggle semantics**: toggle → reload → persists. Clear storage → follows the OS again,
  *live*, with the tab still open. Toggling to the theme the OS already prefers still
  creates a sticky override. With `localStorage` throwing, the toggle still works and
  nothing throws.
- **The bulb**: dark→light plays once with a countable number of soft pulses and the page
  interactive throughout; light→dark is instant; a double-tap resolves with no residual
  overlay; reduced-motion is instant both ways.
- **The light Void**: clear colour, fog, loader, reticle, hint, and CTA all correct;
  light-trails absent in light and present in dark; nav visible on load without pointer
  movement; scrim legible with a bright frame behind it.
- **Preference matrix**: `prefers-contrast: more` pins the neutral ground in both themes;
  reduced-motion behaviour elsewhere on the site is unchanged.
- **Coverage**: every live page × both themes × {desktop, 375px}, with screenshots.

**The honesty boundary.** Three things cannot be proven in this environment. No claim of
"verified" is made for any of them from a code read or a headless screenshot — they are the
owner's on-device pass, and this issue does not close until that pass happens:

1. Whether the light Void's fog density reads as depth against paper.
2. Whether the bulb's flicker *feels* like a tungsten warm-up on a real display, and
   whether the number and spacing of pulses is right.
3. Whether the centre logo holds against paper without a light-variant asset.

### Acceptance criteria

- [ ] The complete contrast table passes: all text ≥4.5:1, all UI ≥3:1, nav type at the
      text bar with no exemption
- [ ] No FOUC on any live page, in either OS preference, on a fresh profile
- [ ] Toggle persistence, live-follow, sticky-override, and storage-blocked paths all
      behave as specified
- [ ] The bulb behaves as specified in all four cases (both directions, double-tap,
      reduced-motion)
- [ ] Screenshot matrix captured: every live page × both themes × {desktop, 375px}
- [ ] The dark theme is confirmed pixel-identical to the pre-change site
- [ ] Every existing `prefers-reduced-motion` fallback across the Void, the living Mosaic,
      the Glissando, and the Listing is confirmed untouched
- [ ] The Void's intro, chase, One-Euro smoothing, and frame-aligned detection are
      confirmed untouched
- [ ] **Owner on-device sign-off recorded** for fog density, bulb feel, and logo-on-paper —
      with any resulting tuning landed before this closes

### Blocked by

- Slices 1–11.
