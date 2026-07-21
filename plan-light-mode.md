# Plan — Light mode: "ink & gold on paper"

Grilled 2026-07-21. Decisions recorded in
[ADR 0015](docs/adr/0015-two-static-themes-retire-the-hour.md); vocabulary in
[CONTEXT.md](CONTEXT.md) (**the theme**, **the theme toggle**, **the bulb**).

## Settled decisions (do not re-litigate)

| Decision | Answer |
| --- | --- |
| Void in light mode | Goes light too — paper-white space, "not blinding but total white" |
| The Hour | **Deleted** in both themes (near-invisible; collides with theming) — ADR 0015 |
| Light palette | Warm paper (`--cream` family lifted toward white) + ink text + gold darkened to ochre where read; hue kept, value shifted |
| Default | `prefers-color-scheme`, followed **live** until the visitor toggles |
| Toggle logic | 2-state; explicit choice persists in `localStorage`, wins forever |
| Toggle form | Sun/moon **glyph** showing the current theme; accessible name still names the destination. (Was a destination-labelled LIGHT / DARK text link — changed by the owner 2026-07-21.) |
| Switch transition | **The bulb**: dark→light flickers on (tungsten warm-up); light→dark snaps off instantly. Reduced-motion: instant both ways |
| Void nav | Always visible on every device (desktop peek retired), soft short scrim in both themes |
| Admin | Themed too, gets the toggle |
| Photos/videos | Never re-graded by theme — The Hour's surviving hard rule |

## Hard constraints

- **Photosensitivity**: the bulb's flicker is 2–3 *soft* luminance pulses over
  ~750ms — an opacity curve with dips, never hard black/white alternation.
  Stays far under the WCAG 2.3.1 three-flashes-per-second general threshold.
- **`prefers-reduced-motion`**: no flicker; instant clean swap both directions.
- **`prefers-contrast: more`**: neutral ground per theme (pure `--black` /
  pure paper, no atmosphere), same contract The Hour honoured.
- **No FOUC**: theme resolved by an inline `<head>` script *before* the
  stylesheet paints, on every page.
- **Contrast math is not optional**: every token pair below ships with a
  computed ratio; nav text (12px letterspaced) needs ≥4.5:1. Computed by
  `tools/contrast-check.ps1` — run it after touching any token value.

### Corrections from the slice-1 contrast pass (2026-07-21)

Two values this plan proposed did not survive the computation and were
shifted in value with their hue kept:

| Token | Proposed | Computed | Shipped | Why |
| --- | --- | --- | --- | --- |
| light `--accent` | `#8a6a1f` | 4.71:1 paper but **4.33:1 on `--surface`** | `#7a5d15` (5.29:1 on surface) | Gold labels sit on Listing cards, not only on paper. `#8a6a1f` demoted to `--accent-dim`, where the 3:1 UI bar is the right bar. |
| nav scrim top stop | `.55` | **3.79:1** dark nav type over a white frame | `.65` (5.39:1) | `.60` lands exactly on 4.50 with no margin. Still soft — the gradient is transparent by 60% of its height. |

---

## Phase 1 — Token architecture (styles.css + every `<head>`)

**Semantic token layer.** Today `--black`/`--cream` are used directly as
bg/text. Introduce semantic tokens and re-point all usages; keep the old names
as dark-theme primitives.

```css
:root {                       /* dark = default (also the no-JS fallback) */
  --bg:        #0a0a0a;       /* was --black used as bg */
  --bg-deep:   #080808;       /* Void clear colour / loader */
  --surface:   #141412;       /* was --black-soft */
  --ink:       var(--cream);  /* body text */
  --muted:     var(--grey);
  --accent:       #e3b23c;    /* gold, readable on dark (7.4:1 on #0a0a0a) */
  --accent-dim:   #a8822c;
  --line:      rgba(243, 237, 225, 0.12);
  --ink-rgb:   243, 237, 225; /* channel triplets for the alpha'd hardcodes */
  --bg-rgb:    10, 10, 10;
}
html[data-theme="light"] {
  --bg:        #faf7ef;       /* paper, lifted from --cream (ink 17.0:1) */
  --bg-deep:   #f4f0e6;       /* light Void space — a step below page paper */
  --surface:   #f3ede1;       /* --cream itself becomes the raised surface */
  --ink:       #171512;       /* warm near-black ink (17.0:1 paper / 15.6:1 surface) */
  --muted:     #6e6a5e;       /* 5.05:1 paper / 4.63:1 surface — verified */
  --accent:       #7a5d15;    /* gold-ink: ochre, 5.76:1 paper / 5.29:1 surface */
  --accent-dim:   #8a6a1f;    /* large/decorative gold only in light (4.71:1, UI bar) */
  --accent-fill:  #e3b23c;    /* bright gold reserved for large fills (.btn sweep) */
  --line:      rgba(23, 21, 18, 0.14);
  --ink-rgb:   23, 21, 18;
  --bg-rgb:    250, 247, 239;
}
@media (prefers-color-scheme: light) {   /* no-JS fallback only */
  html:not([data-theme]) { /* same light block */ }
}
```

- Sweep styles.css: replace `var(--black)`→`var(--bg)`, `var(--cream)` (as
  text)→`var(--ink)`, `var(--gold)`→`var(--accent)` etc. Keep `--gold` defined
  (JS and inline fallbacks reference it) but alias it: `--gold: var(--accent)`.
- **Hardcoded-value audit** (~30 hits): nav gradient
  ([styles.css:144](styles.css)) → `rgba(var(--bg-rgb), …)`; `::selection`;
  `.grain` (see Phase 4); loader `#080808` ([index.html:133](index.html));
  `.vl-track` `rgba(255,255,255,0.08)` → `rgba(var(--ink-rgb), 0.08)`; Void
  inline gold fallbacks `#c5a44c` (audit finding 7 — fix while here);
  `drop-shadow` on the center logo (theme-dependent, see Phase 4).

**Inline resolver** (tiny, duplicated into each page's `<head>` before the
stylesheet — index, projects, project, about, admin):

```html
<script>
(function(){var t;try{t=localStorage.getItem('kta-theme')}catch(_){}
if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
document.documentElement.setAttribute('data-theme',t);})();
</script>
```

**`theme.js`** (new shared file, loaded on all five pages):
- `KTA.theme`: `current()`, `set(theme, {source})`, `subscribe(fn)` — same
  shape as the old `KTA.hourTint` API so the Void's wiring stays one-liner.
- Live-follow: `matchMedia('(prefers-color-scheme: light)')` change listener
  applies **only when no stored override exists**.
- Updates `<meta name="theme-color">` on switch (add the meta to every page;
  ship both `media`-attributed variants for first paint).

## Phase 2 — Delete The Hour

- Remove `hour-tint.js` + its 4 script tags
  ([index.html:677](index.html), [projects.html:65](projects.html),
  [project.html:85](project.html), [about.html:244](about.html)).
- `body { background: var(--hour-tint, var(--black)) }`
  ([styles.css:50](styles.css)) → `background: var(--bg)`.
- `prefers-contrast: more` rule ([styles.css:91](styles.css)) → pins to the
  theme's neutral ground (needs a light variant, not `--black !important`).
- Void subscribe block ([index.html:953-958](index.html)) → replace with
  `KTA.theme.subscribe` swapping `scene.background` / `scene.fog.color`
  between `0x080808` and the light `--bg-deep` int (`BG_COLOR` at
  [index.html:714](index.html) becomes a per-theme pair).
- CONTEXT.md + ADR 0015: already done. Also update the stale reference in
  [plans/README.md](plans/README.md) settled-decisions line if touched.

## Phase 3 — The theme toggle + the bulb

**Markup** — last item in `.nav__links` on all five pages (and index-classic
is orphaned — skip it):

```html
<li><button class="nav__theme" type="button" aria-label="Switch to light theme">LIGHT</button></li>
```

- Styled exactly as the sibling links (12px, 0.18em tracking, uppercase,
  underline-sweep on hover); it's a `<button>` reset to text-link appearance.
  **Shipped as a glyph instead** (owner, 2026-07-21): two inline SVGs in the
  button, shown/hidden by CSS off `html[data-theme]`; only the `aria-label` and
  `title` are swapped in JS. No underline sweep — hover shifts to `--accent`.
- Keyboard: it's a real button — free. No animation on keyboard activation
  beyond the bulb itself (the bulb is a page transition, not control chrome).

**The bulb** (in `theme.js` + a few CSS keyframes):
- Dark→light: set tokens instantly, then run a full-viewport overlay
  (`position:fixed; inset:0; z-index:250;` — above `.grain` at 200) filled
  with the *old* dark `--bg`, whose opacity plays an irregular flicker-out:
  roughly `1 → .55 → .85 → .25 → .5 → 0` over ~750ms with uneven keyframe
  spacing, easing `linear` between dips (a filament stutters, it doesn't
  glide). First ~150ms tint the overlay warm (`#1a1206`) — tungsten warm-up.
  Overlay is `pointer-events:none`; page is interactive throughout.
- Light→dark: instant token swap; at most a single 90ms fade of a dark
  overlay from 0→1→gone (the "snap") — or nothing. No flicker.
- The Void listens via `KTA.theme.subscribe` and swaps clear/fog colour
  immediately — the overlay covers the seam.
- `prefers-reduced-motion`: skip overlay entirely.
- The overlay passes over photographs for <1s; that is a *transition*, not a
  grade — same category as the Cover morph, no rule violated.

## Phase 4 — The light Void (the redesign surface)

- `BG_COLOR` pair: dark `0x080808`, light `0xf4f0e6`. Fog density may need a
  nudge in light (depth reads differently against white — eyeball pass).
- **Shutter-drag light-trails** ([index.html:1150](index.html), ADR 0014):
  gate the LIGHTEN trail term to dark theme (uniform or shader branch); the
  motion smear runs in both. CONTEXT.md already records this.
- **Loader** ([index.html:129-172](index.html)): bg → `--bg-deep`, track →
  `rgba(var(--ink-rgb), .08)`, count colour likewise. Gold text → `--accent`.
- **Reticle / hint / camera indicator / Reach CTA**: gold → `--accent`
  (ochre in light). Red camera dot: verify against paper, keep red.
- **Center logo drop-shadow** ([index.html:94](index.html)):
  `rgba(0,0,0,0.7)` reads as a hole on paper — light theme gets a soft warm
  shadow at ~0.18 or none. **Check logo.png legibility live on paper** — gold
  letters have dark outlines and should hold; if not, a light-variant asset.
- **Grain** (`.grain`, `#void-grain`): `soft-light` at 0.07 was tuned against
  near-black. On paper, re-tune: likely `multiply` at ~0.04 (or keep
  soft-light and re-eyeball). Token-switch the blend/opacity per theme.
- **Frames**: shader intentionally untouched (photos shown true). Frame
  *edges/mounts* if gold-tinted → `--accent`.

## Phase 5 — Nav always visible on the Void + soft scrim

- Delete the desktop peek: CSS `transform: translateY(-110%)` block
  ([index.html:35-43](index.html)) and the pointer-near-top handler
  ([index.html:1421-1423](index.html), plus `is-peek` cleanup at
  [index.html:1263](index.html) wiring).
- Replace the Void nav's `background: transparent` with the **soft short
  scrim**: the site nav gradient at ~half opacity, no blur —
  `linear-gradient(to bottom, rgba(var(--bg-rgb), .55), rgba(var(--bg-rgb), .28) 60%, transparent)`.
  Mobile keeps its existing always-visible behaviour, gains the same scrim.
- The nav's site-wide gradient ([styles.css:144](styles.css)) goes
  token-based so it themes everywhere.

## Phase 6 — Page sweeps

- **Projects index**: frame numbers, meta lines, underline sweeps → tokens.
  Grayscale→colour thumbnail bloom is theme-neutral; verify hover contrast of
  the gold underline (ochre in light).
- **Mosaic / Spotlight**: the mount's dim-gold hairline and full-gold lit
  state → `--accent-dim`/`--accent` (light values verified against paper);
  dimmed resting films — dimming via opacity reads *lighter* on paper, check
  it still reads as "off"; sound badge, back-btn gold sweep → `--accent-fill`
  with ink text (verify ≥4.5:1 for the label on gold: use `--black` text on
  gold fill in both themes).
- **Listing**: cream cards on paper ground vanish — give cards `1px solid
  var(--line)` + a soft paper shadow in light only. Card ink/illustrations
  already dark — mostly free.
- **Footer wordmark, buttons, secret-egg toast, scrollbars** (if styled):
  token sweep.
- **Admin**: same token sweep of its ~9 hardcoded values + the toggle in its
  header. Functional QA only (it's private).

## Phase 7 — Verification protocol

1. **Contrast table** (computed, not eyeballed): ink/paper, muted/paper,
   accent/paper, accent on surface, gold-fill + ink label, nav text over
   scrim + worst-case bright frame behind it. All text ≥4.5:1, UI ≥3:1.
2. **Browser pass** (launch.json server): all 5 pages × both themes ×
   {desktop, 375px} — screenshots. Emulate `prefers-color-scheme` both ways
   with no stored key: first paint must match OS with **no flash**.
3. **Toggle semantics**: toggle → reload → persists; clear storage → follows
   OS live (flip emulation while page open, untouched visitors re-theme).
4. **The bulb**: dark→light flicker plays once, ≤3 pulses, page interactive
   during; light→dark is instant. Reduced-motion: both instant.
5. **Void**: light Void renders (clear colour, fog, loader, reticle, hint),
   trails absent in light / present in dark, nav visible on load without
   pointer movement, scrim legible over a bright frame.
6. **Contrast/motion prefs**: `prefers-contrast: more` pins neutral ground in
   both themes; reduced-motion unchanged elsewhere.
7. **Honesty note**: WebGL feel, real-device flicker feel, and the light
   Void's fog density are eyeball items — flag for the owner's on-device
   pass (same HITL convention as The Hour's Issue 1.3 was).

## Execution order

Phases 1→2→3 are the spine (tokens, Hour deletion, toggle+bulb) and land
together — the site is bi-theme but unpolished after them. 4 (Void) is the
big rock; 5 (nav) is small and independent; 6 is a sweep; 7 gates done.
