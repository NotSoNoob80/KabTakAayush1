# PRD — Light mode: "ink & gold on paper"

- **Status**: ready-for-agent
- **Date**: 2026-07-21
- **Canonical plan**: [plan-light-mode.md](plan-light-mode.md) — phase breakdown,
  file/line references, exact token values, execution order.
- **Decisions**: [ADR 0015](docs/adr/0015-two-static-themes-retire-the-hour.md)
- **Vocabulary**: [CONTEXT.md](CONTEXT.md) — **the theme**, **the theme toggle**,
  **the bulb**, **the Hour** (retired).

## Problem Statement

The site is dark-only. A visitor whose device is set to a light colour scheme —
who reads every other site, app, and OS surface on warm white — arrives at a
page of near-black and has no way to change it. There is no toggle, no
preference detection, and nothing that acknowledges the choice they already
made at the OS level. On a bright phone screen outdoors, the site is the
hardest thing on the device to read.

Two further problems sit underneath that one:

- **The Hour** — the site's clock-driven grade of its negative space — owns the
  page background and the Void's clear colour today. Its documented hard rules
  are written against a dark ground ("near-black with a hint", 2–5% lightness
  swings). It has no light counterpart, and its effect is invisible to visitors
  in practice (the owner's own assessment). Two systems cannot both own the
  background pixels.
- **Brand gold** (`#e3b23c`) is ~1.9:1 against white. Every gold hairline, every
  gold label, **the reticle**, **the mount** on **the lit film**, the nav's
  underline sweep — all of it fails legibility the moment the ground goes
  light. Inverting the palette naively produces an unreadable site.

And the Void — the homepage — is not a page with a background; it is a WebGL
field with a clear colour, fog, a loader, a **reticle**, a hint line, and a
**shutter drag** shader whose **light-trails** are a lighten-only pass. None of
that themes for free.

## Solution

The site renders in one of two **themes**, and never a third:

- **Dark** — the existing cinematic black & gold, unchanged.
- **Light** — *ink & gold on paper*: a warm paper ground in the `--cream`
  family lifted toward white, near-black warm ink for text, and brand gold
  **value-shifted with its hue kept** — an ochre wherever gold must be *read*,
  with the bright `#e3b23c` reserved for large fills.

A first visit follows the device's `prefers-color-scheme`, resolved by an
inline `<head>` script before the stylesheet paints, so there is no flash of
the wrong theme on any page. A visitor who never touches **the theme toggle**
keeps following live OS changes — flip the OS to dark at dusk and the open tab
follows. One tap of the toggle is an explicit choice: it persists in
`localStorage` and wins forever after on that device.

**The theme toggle** is a small sun/moon **glyph** at the end of the nav links.
It shows the theme you are currently in — a moon while the site is dark, a sun
while it is light — and it is present on every page, the Void and the **Admin**
included. It carries no underline sweep; its hover signal is a shift to the
accent gold. Its *accessible name* still names the destination ("Switch to
light theme"), because a control's name has to say what pressing it does.

> **Changed after implementation, 2026-07-21 (owner).** This originally
> specified a destination-labelled **text** control in the nav's own voice
> (12px letterspaced uppercase, gold underline sweep, reading LIGHT / DARK).
> The owner replaced it with a glyph. User story 9 below is superseded by that
> decision and is kept only as a record of what was originally intended.

The switch itself is **the bulb**, and it is deliberately asymmetric, like a
real tungsten fixture: dark→light *flickers on* (two or three soft, irregular
luminance pulses over well under a second, warm-tinted at the top of the
curve), while light→dark *snaps off* instantly. Under `prefers-reduced-motion`
there is no flicker in either direction.

The Void goes light too — paper-white space, not blinding but total. Its clear
colour, fog, loader, reticle, hint, and CTA all become theme consumers.

**The Hour is deleted entirely** — script, script tags, CSS fallback chain, and
the Void's subscribe hook. Git history is the archive. Its one hard rule
survives and is inherited by **the theme**: *the theme grades only the room
around the work — never a photographic pixel*. Photographs and videos render
identically in both themes.

## User Stories

### Arrival and default

1. As a visitor whose OS is set to light mode, I want the site to open in the
   light theme on my very first visit, so that it matches every other surface
   on my device without me having to configure anything.
2. As a visitor whose OS is set to dark mode, I want the site to open in the
   dark theme exactly as it does today, so nothing I already like changes.
3. As a visitor on any page — the Void, the Projects index, a Mosaic, the
   Listing, or the Admin — I want my theme to be correct from the first painted
   frame, so I never see a flash of the wrong ground before the page settles.
4. As a visitor arriving directly on a deep link (a project page shared to me),
   I want the same first-paint correctness as on the homepage, so the theme is
   a property of the site and not of the entry point.
5. As a visitor with JavaScript blocked, I want the site to still respect my OS
   colour scheme, so the page is readable even in the degraded case.
6. As a visitor with JavaScript blocked and no OS preference expressed, I want
   the site to fall back to the dark theme it ships today, so the default is
   never an unstyled or half-themed page.

### The theme toggle

7. As a visitor who wants the other theme, I want a visible control in the nav
   on every page, so I never have to hunt for it or go to a settings page.
8. As a visitor looking at the toggle, I want it to name *where it will take
   me* — LIGHT while I'm in dark, DARK while I'm in light — so I know what
   pressing it does before I press it.
9. As a visitor, I want the toggle to look and behave like the nav links beside
   it (same 12px letterspaced uppercase, same underline sweep on hover), so the
   nav still reads as one row of type and not as a row with a widget in it.
10. As a keyboard user, I want to reach the toggle by Tab and activate it with
    Enter or Space, so the theme is not a pointer-only feature.
11. As a screen-reader user, I want the toggle to announce what it will switch
    to, and to re-announce correctly after I use it, so the control is not a
    dead-end label.
12. As a visitor who chose a theme, I want that choice to survive a reload and
    a return visit, so I only ever have to make it once.
13. As a visitor who chose a theme, I want that choice to survive my OS
    changing later, so my explicit decision is not overridden by an automatic
    one.
14. As a visitor who has *never* touched the toggle, I want the site to follow
    my OS live — including while the tab is already open — so a scheduled
    light/dark switch at sunset carries the site with it.
15. As a visitor whose browser blocks `localStorage` (private mode, strict
    settings), I want the toggle to still work for the current page and the
    site to not throw, so a privacy setting does not break a control.
16. As a visitor on the Void, I want the toggle to be reachable without first
    discovering a hidden nav, so the homepage is not the one page where the
    theme is unavailable.
17. As the owner using the Admin, I want the Admin themed and carrying the same
    toggle, so my private tool is not the one dark rectangle left on a light
    machine.

### The bulb

18. As a visitor switching from dark to light, I want the transition to feel
    like a tungsten bulb warming up — a couple of soft, irregular pulses — so
    the switch is a moment with character rather than a hard swap.
19. As a visitor switching from light to dark, I want it to snap off instantly,
    because that is what a light switch does, and a flicker on the way *down*
    would read as a bug.
20. As a photosensitive visitor, I want the flicker to be soft luminance pulses
    well under the flash-threshold rate — never a hard black/white alternation
    — so the transition is safe to watch.
21. As a visitor who has requested reduced motion, I want no flicker at all and
    an instant clean swap in both directions, so the accessibility contract
    that every other motion system on this site honours is honoured here too.
22. As a visitor who taps the toggle, I want the page to stay interactive
    throughout the transition, so the bulb never blocks a click I want to make.
23. As a visitor who taps the toggle twice quickly, I want the transition to
    resolve cleanly to the theme I actually chose, with no stuck overlay and no
    half-lit page.
24. As a visitor switching themes while looking at photographs, I want the
    transition to pass over the images without leaving them altered, so the
    work is never graded — only briefly transited, the same category as **the
    Cover** morph.
25. As a visitor switching themes on the Void, I want the WebGL space and the
    page chrome to change together as one event, so I never see the canvas and
    the nav disagree about which theme it is.

### The light theme's legibility

26. As a visitor reading body text on paper, I want ink that is comfortably
    dark against the warm ground, so long copy is not a squint.
27. As a visitor reading the nav's small letterspaced type in light mode, I
    want it to clear the text contrast bar, so the smallest type on the site is
    not the least readable.
28. As a visitor reading a gold-coloured label, hairline, or link in light
    mode, I want that gold to be darkened to an ochre that is actually
    readable, so the brand accent survives the theme instead of dissolving into
    the paper.
29. As a visitor looking at a large gold fill (a button sweep, the back
    button), I want the bright brand gold retained there with dark ink on top,
    so the brand's loud moments stay loud and the label on them stays legible.
30. As a visitor of the Listing in light mode, I want the classifieds **cards**
    to still read as separate clippings against the paper ground, so they don't
    vanish into it now that both are pale.
31. As a visitor who has requested more contrast, I want each theme to pin to
    its neutral ground with no atmosphere, so legibility is never traded for
    mood — the same contract **the Hour** honoured.
32. As a visitor of the mobile browser chrome, I want the address bar to match
    the theme I'm in, so the browser frame doesn't clash with the page.

### The light Void

33. As a visitor arriving at the Void in light mode, I want a paper-white space
    — total, but not blinding — so the homepage reads as deliberate whitespace
    rather than a dark page with the lights left on.
34. As a visitor of the light Void, I want the fog and depth falloff to still
    communicate distance against the bright ground, so **frames** far away
    still read as far away.
35. As a visitor of the light Void, I want the loading sequence — background,
    progress track, and count — themed, so the very first thing I see is
    already the right theme.
36. As a visitor of the light Void, I want the centre logo to stay legible
    against paper and not sit in a dark halo, so the mark reads as printed on
    the page rather than punched out of it.
37. As a visitor of the light Void, I want the film-grain texture retuned for a
    bright ground, so the grain still reads as texture instead of as noise or
    as nothing at all.
38. As a visitor moving fast through the light Void, I want the motion smear of
    **shutter drag** to still play, so the signature long-exposure feel is not
    a dark-mode-only feature.
39. As a visitor moving fast through the light Void, I want the **light-trails**
    pass suppressed in light mode, because a lighten-only trail cannot read
    against a bright ground and would only wash the frames out.
40. As a visitor of the Void in either theme, I want the **frames** themselves
    rendered exactly as they are today, so my photographs are never re-graded
    by the room they hang in.
41. As a visitor who enables **the Reach**, I want **the reticle**, its
    **clutch ring**, and the on-canvas hint themed so they stay visible in
    light mode, so the only feedback channels the Reach exposes don't disappear
    on a light device.
42. As a visitor who enables the Reach in light mode, I want the
    **camera-active indicator** to stay clearly visible red on paper, because
    its job is privacy honesty and it must never be the thing that fades.

### The Void nav

43. As a visitor landing on the Void, I want the site nav visible immediately
    without moving my pointer, so I can navigate without discovering a hidden
    behaviour first.
44. As a desktop visitor of the Void, I want the nav to stop hiding and
    revealing itself as my pointer nears the top edge, so the header stops
    reacting to a gesture I didn't intend.
45. As a visitor of the Void in either theme, I want a soft short scrim behind
    the nav, so the nav type stays readable even when a bright frame drifts
    directly behind it.
46. As a mobile visitor of the Void, I want the nav to keep its existing
    always-visible behaviour and gain the same scrim, so mobile and desktop
    finally behave identically here.

### Page-by-page sweep

47. As a visitor of the Projects index in light mode, I want the **frame
    numbers**, meta lines, and underline sweeps themed, so the whole row reads
    as one designed object in either theme.
48. As a visitor of the Projects index, I want the grayscale→colour bloom of an
    **inline thumbnail** to work identically in both themes, because the
    contact-sheet reveal is about the photograph, not about the room.
49. As a visitor of a Mosaic in light mode, I want the images shown exactly as
    they are in dark mode, so a project page is a faithful presentation in
    either theme.
50. As a visitor of a **Spotlight** in light mode, I want **the mount** on the
    **lit film** to still read as clearly "on" against the paper, so the
    now-playing mark still does its job.
51. As a visitor of a Spotlight in light mode, I want the resting, dimmed films
    to still read as "off", because dimming by opacity reads *lighter* on paper
    and could invert the signal.
52. As a visitor of the Listing in light mode, I want the scroll-scrub, the
    beats, and every card state to behave exactly as they do in dark mode, so
    the theme changes the palette and nothing about the choreography.
53. As a visitor of the footer wordmark in light mode, I want the per-letter
    press and the touch **Glissando** to look and feel exactly as they do in
    dark mode, so a settled taste decision is not quietly re-tuned by the
    theme work.
54. As a visitor who finds the secret egg in light mode, I want its toast
    themed, so even the hidden surfaces are finished.

### Not regressing what exists

55. As a visitor who liked the site exactly as it was, I want the dark theme to
    be pixel-identical to today's site, so "we added light mode" never means
    "we changed the site I already knew".
56. As a visitor, I want every existing `prefers-reduced-motion` fallback
    across the Void, the living Mosaic, the Glissando, and the Listing
    untouched, so the theme work does not become a motion change by accident.
57. As a visitor, I want the Void's intro, chase, One-Euro smoothing, and
    frame-aligned detection architecture untouched, so hard-won de-jank work is
    not disturbed by a palette change.
58. As the owner, I want **the Hour** removed rather than left dormant behind a
    flag, so no future reader has to reconcile a disabled system whose
    documented rules contradict the live ones.

## Implementation Decisions

### Token architecture (the load-bearing decision)

- **Introduce a semantic token layer.** Today `--black` / `--cream` / `--gold`
  are consumed directly as background / text / accent. A semantic layer
  (`--bg`, `--bg-deep`, `--surface`, `--ink`, `--muted`, `--accent`,
  `--accent-dim`, `--accent-fill`, `--line`) is introduced and every usage
  re-pointed to it. The existing primitives keep their current values and
  become the dark theme's primitives.
- **`--gold` stays defined as an alias of `--accent`.** JS and inline
  fallbacks reference `--gold` by name; aliasing rather than deleting avoids a
  wide, risky rename in code paths the CSS sweep does not cover.
- **Channel-triplet tokens** (`--ink-rgb`, `--bg-rgb`) ship alongside the hex
  tokens so the roughly thirty hardcoded `rgba(…)` values in the codebase
  (nav gradient, `::selection`, grain, loader track, Void inline fallbacks) can
  be expressed as `rgba(var(--bg-rgb), …)` and theme automatically.
- **Themes are selected by `data-theme` on `<html>`.** Dark is `:root`'s
  default, so it is also the no-JS and pre-script state. Light is a
  `html[data-theme="light"]` override block, mirrored inside a
  `@media (prefers-color-scheme: light) html:not([data-theme])` rule purely as
  the no-JS fallback.
- **Hue kept, value shifted.** The light palette is not an inversion. The paper
  ground is the existing `--cream` family lifted toward white; ink is the
  `--black` family warmed; gold moves down in value into an ochre band while
  keeping its hue. Exact values are in the plan; each ships with a computed
  contrast ratio.
- **Three gold roles are distinguished** where dark mode needed only one:
  `--accent` (gold that must be *read* — ochre in light), `--accent-dim`
  (decorative / large gold), and `--accent-fill` (bright brand gold reserved
  for large fills, which always carries dark ink as its label colour in both
  themes).
- **Void inline gold fallbacks are corrected while here.** The Void's inline
  CSS uses `#c5a44c` where brand gold is `#e3b23c` (a known audit finding); the
  sweep aligns them rather than porting the drift into a second theme.

### Theme resolution

- **An inline `<head>` resolver runs before the stylesheet**, duplicated into
  all five live pages (index, projects, project, about, admin). It reads the
  stored choice, falls back to `prefers-color-scheme`, and stamps `data-theme`
  on `<html>`. It is deliberately duplicated rather than externalised: an
  external script cannot be guaranteed to run before first paint, and FOUC is a
  hard constraint. The resolver is wrapped so a `localStorage` throw (private
  mode) degrades to the OS preference rather than breaking the page.
- **Storage key**: a single namespaced key holding `"light"` or `"dark"`. Any
  other value is treated as absent.
- **Resolution order**: stored explicit choice → OS preference (followed live)
  → dark.
- **Live OS following applies only when no stored override exists.** The
  `matchMedia` change listener is a no-op once the visitor has chosen.
- **`<meta name="theme-color">`** is added to every page with both
  `media`-attributed variants for first paint, and updated on switch.

### The `KTA.theme` module (the primary new seam)

- **A new shared `theme.js`, loaded on all five pages**, exposes
  `KTA.theme` with `current()`, `set(theme, { source })`, and `subscribe(fn)`.
- **The API deliberately mirrors the retired `KTA.hourTint`** — same
  `current()` / `subscribe()` shape, with `subscribe` firing the listener
  immediately on registration and returning an unsubscribe function, and a
  listener throw never breaking the page. This is the existing seam, reused:
  the Void's WebGL wiring stays a one-liner and the migration is a swap, not a
  redesign.
- **`set(theme, { source })`** carries where the change came from, so the
  module can distinguish an explicit toggle (persist, run **the bulb**) from a
  live OS change (do not persist).
- **`KTA.theme` is the single writer of `data-theme`.** Nothing else stamps the
  attribute after first paint.

### Deleting the Hour

- `hour-tint.js` and its four script tags are removed. The
  `background: var(--hour-tint, var(--black))` fallback chain on `body` becomes
  a plain `var(--bg)`. The `prefers-contrast: more` rule is rewritten to pin
  each theme to *its own* neutral ground rather than forcing `--black`.
- The Void's `KTA.hourTint.subscribe` block is replaced by a
  `KTA.theme.subscribe` that swaps `scene.background` and `scene.fog.color`;
  the scene's single `BG_COLOR` constant becomes a per-theme pair.
- Documentation is already updated (CONTEXT.md, ADR 0015); the stale
  settled-decisions reference in `plans/README.md` is corrected.

### The theme toggle

- A real `<button>`, reset to text-link appearance, as the last item in the nav
  links list on all five live pages. `index-classic.html` is orphaned (zero
  inbound references) and is deliberately skipped.
- **Superseded 2026-07-21**: the control is a sun/moon glyph, not a label.
  Which glyph shows is decided in CSS off `data-theme`, so the correct icon is
  painted by the same pass that paints the theme and can never flash the wrong
  one — script never touches the button's contents. The `aria-label` still
  names the *destination* theme and still updates on every theme change,
  including changes that did not originate from the button (a live OS flip).
- Being a real button, keyboard support and focus behaviour are free; no
  custom key handling is added.

### The bulb

- **Dark→light**: tokens swap instantly, then a full-viewport overlay filled
  with the *outgoing* dark ground plays an opacity flicker-out — roughly three
  soft dips over well under a second, with deliberately uneven keyframe spacing
  and linear easing between dips (a filament stutters; it does not glide). The
  first moments of the curve tint the overlay warm for the tungsten warm-up.
- The overlay is `pointer-events: none` and sits above the grain layer, so the
  page stays fully interactive and the whole surface (including the WebGL
  canvas) is covered by one element.
- **Light→dark**: instant token swap, with at most a single very short dark
  fade as the "snap". No flicker.
- **The overlay is the seam-cover** for the Void's clear-colour swap: the
  canvas changes underneath it, so there is no visible two-step.
- **`prefers-reduced-motion`**: the overlay is skipped entirely in both
  directions.
- **Photosensitivity is a hard constraint, not a tuning parameter.** The pulses
  are soft luminance dips in a single opacity channel, never hard black/white
  alternation, and stay far under the three-flashes-per-second general
  threshold.

### The light Void

- `BG_COLOR` becomes a dark/light pair. Fog density may need a per-theme nudge
  (depth reads differently against a bright ground) — an eyeball item.
- The **light-trails** term of the shutter-drag shader is gated to the dark
  theme (uniform or shader branch). The motion smear itself runs in both
  themes. This is already recorded in CONTEXT.md and ADR 0015's consequences.
- The frame `ShaderMaterial` is **intentionally untouched** — the same
  boundary the Hour held. Only frame edges/mounts, if gold-tinted, follow
  `--accent`.
- The centre logo's drop shadow is theme-dependent: the current dark shadow
  reads as a hole on paper, so light mode gets a soft warm shadow or none. The
  logo asset's own legibility on paper is a live check; a light-variant asset
  is the fallback if the gold letters don't hold.
- The grain overlay's blend mode and opacity were tuned against near-black and
  become per-theme values.

### The Void nav

- The desktop peek is deleted outright — both the transform-based hidden state
  and the pointer-near-top handler, plus its class cleanup wiring.
- The Void nav's transparent background is replaced by a **soft short scrim**:
  the site nav's gradient at roughly half opacity, no blur. Mobile keeps its
  existing always-visible behaviour and gains the same scrim.
- The site-wide nav gradient becomes token-based so it themes everywhere.

### Sweep boundaries

- The Listing's cards gain a hairline border and a soft paper shadow **in light
  only**, because a cream card on a paper ground has no edge otherwise.
- The Admin gets the same token sweep and the toggle in its header; because it
  is private, it is held to functional QA only, not the full contrast protocol.
- No behavioural change to any motion system. The theme work is a palette and
  chrome change plus one new transition (**the bulb**) and one deletion (the
  peek).

### Execution shape

Phases 1–3 (tokens, Hour deletion, toggle + bulb) are the spine and land
together — after them the site is bi-theme but unpolished. Phase 4 (the light
Void) is the large surface. Phase 5 (nav) is small and independent. Phase 6 is
the page sweep. Phase 7 gates done.

## Testing Decisions

**What makes a good test here.** The externally observable behaviour is: *which
theme is painted, on which first frame, given which inputs* — and *is the
resulting text readable*. Asserting that a CSS custom property has a particular
hex value tests the stylesheet back to itself and proves nothing about either.
So the suite splits in two: the one thing that is genuinely computable is
computed, and everything perceptual is verified by visit — the same precedent
set by `PRD-feel-polish.md` ("verification is by visit, not by suite") and by
every Mosaic / Spotlight / Glissando change before it.

### The one automated seam: the contrast checker

The plan states that contrast math is not optional, and contrast is the one
property of this feature that a machine can decide better than an eye. A small
standalone contrast-ratio script is added and run over the token pairs.

- **Seam**: the token pairs themselves — the checker takes pairs of colour
  values and a required ratio, and reports computed ratios. It does not parse
  the stylesheet's structure or assert on selectors, so it survives any
  refactor of how the tokens are organised.
- **Pairs checked, per theme**: ink on ground; muted on ground; accent on
  ground; accent on raised surface; ink label on the bright gold fill; nav text
  against the scrim's effective composite.
- **Bars**: text ≥4.5:1, UI/graphical ≥3:1. The nav's 12px letterspaced type is
  called out explicitly — it is the smallest type on the site and gets no
  large-text exemption.
- **Prior art**: none in this repo — this is the first automated check. It is
  kept deliberately tiny and dependency-free so it does not become a test
  framework by stealth.

### Browser pass (the launch.json static server)

- **First paint, no stored choice**: emulate `prefers-color-scheme` both ways
  and load all five pages. The painted theme must match the emulated OS
  preference with **no flash** of the other ground. This is the FOUC gate and
  it is checked per page, because the resolver is duplicated per page.
- **Toggle semantics**: toggle → reload → the choice persists. Clear storage →
  the page follows the OS again, *live*, with the tab still open. Toggling
  while the OS is set to the same theme still creates a sticky override.
- **Storage-blocked path**: with `localStorage` throwing, the toggle still
  switches the current page and nothing throws to the console.
- **The bulb**: dark→light plays the flicker once, with a countable number of
  soft pulses and the page interactive throughout; light→dark is instant.
  Double-tapping resolves to the last-chosen theme with no residual overlay.
  Under `prefers-reduced-motion`, both directions are instant.
- **The light Void**: clear colour, fog, loader, reticle, hint, and CTA all
  render correctly; light-trails absent in light and present in dark; the nav
  is visible on load without any pointer movement; the scrim keeps nav type
  legible with a bright frame drifting behind it.
- **Preference matrix**: `prefers-contrast: more` pins the neutral ground in
  *both* themes; `prefers-reduced-motion` behaviour elsewhere on the site is
  unchanged.
- **Coverage**: 5 pages × 2 themes × {desktop, 375px}, with screenshots.
- **Prior art**: the animation-plan executions verified on `localhost:8123`
  against the same static server, with parsed-CSSOM inspection and controlled
  driving of the running engine where a value needed proving. The same
  technique applies here for the Void's per-theme constants.

### The honesty boundary

Three things cannot be proven in this environment and are flagged for the
owner's on-device pass, the same human-in-the-loop convention the Hour's own
tuning issue used:

1. Whether the light Void's fog density reads as depth against paper.
2. Whether **the bulb**'s flicker *feels* like a tungsten warm-up on a real
   display, and whether the number and spacing of pulses is right.
3. Whether the centre logo holds against paper without a light-variant asset.

No claim of "verified" is made for any of the three from a code read or a
headless screenshot.

## Out of Scope

- **A third theme, or a 3-state toggle** (light / dark / system). Rejected in
  ADR 0015: a visitor who never touches the toggle already gets system
  behaviour implicitly, and the extra state is heavier chrome than this nav
  wants.
- **Keeping the Hour dormant behind a flag**, or porting its curve to light.
  Both rejected in ADR 0015.
- **Re-grading photographs or videos by theme**, in any form, anywhere —
  Mosaic images, inline thumbnails, Void frames, the Cover. The frame
  `ShaderMaterial` is not touched.
- **`index-classic.html` and its reel** — orphaned, zero inbound references.
  Not themed, not swept.
- **Any change to motion behaviour**: the Void's intro/chase/One-Euro/rVFC
  architecture, the living Mosaic's three reactions, the Spotlight's handoff,
  the Listing's scrub, the Glissando's settled 460ms spring. The theme changes
  what things look like, not how they move — with the single exception of the
  bulb, which is new, and the peek, which is deleted.
- **Per-theme typography, spacing, or layout.** Only colour, and only the
  chrome around the work.
- **A theme preference synced across devices**, or any server-side storage.
  `localStorage` on the device, and nothing more.
- **Converting the site to an SPA shell** to make the theme switch
  cross-document — the site stays multi-page, which is why the resolver is
  duplicated per page.
- **Introducing a test framework.** One dependency-free contrast script; no
  runner, no browser automation suite.
- **Full accessibility QA of the Admin.** It is private; functional QA only.

## Further Notes

- **Why the seam is a mirror of `KTA.hourTint`.** The Void's subscription to a
  colour source is the highest existing seam for "the room's colour changed",
  and it already has a proven shape. Reusing it means the Void's wiring is a
  one-line swap, the migration is reviewable as a diff rather than a rewrite,
  and any future consumer of the theme has an obvious place to attach.
- **Why the resolver is duplicated rather than shared.** No-FOUC on every page
  is a hard constraint, and only an inline script in `<head>` can guarantee it.
  The duplication is a handful of minified lines and is accepted deliberately;
  the *behaviour* still lives in one place (`theme.js`) after first paint.
- **Photosensitivity is not a taste question.** Everything else about the bulb
  — pulse count, spacing, warmth, duration — is tunable by eye. The constraint
  that the pulses are soft luminance dips staying far under the flash threshold
  is not, and it is the reason the effect is built as an opacity curve on a
  single overlay rather than as a background alternation.
- **The gold problem is the reason light mode is a design job and not a token
  flip.** `#e3b23c` at 1.9:1 on white fails every bar; splitting gold into
  read-gold, decorative-gold, and fill-gold is what lets the brand survive the
  inversion. Any future addition of gold to the site now has to pick a role.
- **The bulb over photographs is a transition, not a grade.** It passes over
  images for well under a second and leaves nothing behind — the same category
  as **the Cover** morph. The never-grade-a-photographic-pixel rule is intact.
- **Source of truth for implementation**: [plan-light-mode.md](plan-light-mode.md)
  carries the phase order, exact token values with target ratios, the
  hardcoded-value audit list, the file/line references, and the full
  verification protocol. This PRD is the *why* and the *what*; the plan is the
  *where*.
