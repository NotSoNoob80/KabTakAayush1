# 003 — Make the piano-key press strike fast and release springy (desktop)

- **Status**: REVERTED (2026-07-20) — the owner feel-checked the strike and rejected it:
  the slow 460ms spring in *both* directions is the wordmark's intended personality
  ("smooth and bouncy"). The symmetric press timing is a settled taste decision, not
  drift. Do not re-flag or re-apply. Original CSS restored byte-for-byte.
- **Commit**: f9a3ae9
- **Severity**: MEDIUM
- **Category**: Interruptibility (asymmetric timing)
- **Estimated scope**: 1 file (styles.css), 3 rules touched

## Problem

The footer wordmark's live variant is `--piano` (projects.html:58, about.html:237,
project.html:78). Its CSS gives press-down and spring-back the **same** 460ms
overshoot curve — so hovering a letter makes it sink slowly, with a bounce, for
nearly half a second. A key strike should snap down and *spring back up*; the
overshoot belongs on the release only.

```css
/* styles.css:2148–2154 — current (base = both directions today) */
.footer__wordmark--piano .char {
  transition:
    color 200ms var(--ease-out),
    /* Slight overshoot on the way back up — the "spring" of a
       released key resettling. */
    transform 460ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

```css
/* styles.css:2216–2235 — current (state rules set only delay/values) */
.footer__wordmark--piano .char:hover {
  color: var(--gold);
  transform: translateY(0.16em) scaleY(0.92);
  transition-delay: 0ms;
  position: relative;
  z-index: 1;
}

.footer__wordmark--piano .char:hover + .char,
.footer__wordmark--piano .char:has(+ .char:hover) {
  color: var(--gold-dim);
  transform: translateY(0.08em) scaleY(0.96);
  transition-delay: 50ms;
}

.footer__wordmark--piano .char:hover + .char + .char,
.footer__wordmark--piano .char:has(+ .char + .char:hover) {
  transform: translateY(0.035em) scaleY(0.985);
  transition-delay: 100ms;
}
```

The intended feel is already documented and implemented — for **touch**. The
Glissando driver (script.js:194–238) presses with a 130ms strong ease-out STRIKE
and releases with a 320ms overshoot SPRING, and the CSS comment at
styles.css:2237–2246 promises the two surfaces "feel like the same instrument."
The desktop hover press is currently ~3.5× slower than the touch press and
bounces on the way down. This is intent/implementation drift, not a settled
tradeoff — safe to fix.

## Target

Press (while `:hover` applies) uses the strike; release (base rule, on unhover)
keeps the spring, shortened to match the Glissando's 320ms:

```css
/* base — release: spring back, matching the Glissando's 320ms SPRING */
.footer__wordmark--piano .char {
  transition:
    color 200ms var(--ease-out),
    /* Slight overshoot on the way back up — the "spring" of a
       released key resettling. */
    transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* pressed key — strike: snaps down in 130ms, like the touch press */
.footer__wordmark--piano .char:hover {
  color: var(--gold);
  transform: translateY(0.16em) scaleY(0.92);
  transition:
    color 130ms var(--ease-out),
    transform 130ms var(--ease-out);
  transition-delay: 0ms;
  position: relative;
  z-index: 1;
}

/* neighbours — same strike, cascading 50/100ms behind the struck key */
.footer__wordmark--piano .char:hover + .char,
.footer__wordmark--piano .char:has(+ .char:hover) {
  color: var(--gold-dim);
  transform: translateY(0.08em) scaleY(0.96);
  transition:
    color 130ms var(--ease-out),
    transform 130ms var(--ease-out);
  transition-delay: 50ms;
}

.footer__wordmark--piano .char:hover + .char + .char,
.footer__wordmark--piano .char:has(+ .char + .char:hover) {
  transform: translateY(0.035em) scaleY(0.985);
  transition:
    color 130ms var(--ease-out),
    transform 130ms var(--ease-out);
  transition-delay: 100ms;
}
```

Values are the Glissando's, verbatim: strike duration 130ms with
`cubic-bezier(0.23, 1, 0.32, 1)` (== `var(--ease-out)`, styles.css:21; the same
curve script.js:194 names STRIKE), release 320ms with
`cubic-bezier(0.34, 1.56, 0.64, 1)` (script.js:195's SPRING, script.js:236's 320ms).

Note the `transition` shorthand resets `transition-delay`, so `transition-delay`
must stay **after** the shorthand inside each state rule, exactly as written above.

## Repo conventions to follow

- Easing tokens: use `var(--ease-out)` (styles.css:21), never the literal, except
  for the spring curve which has no token — keep it as the literal cubic-bezier,
  matching both current usages (styles.css:2153, script.js:195).
- The touch driver is the feel exemplar: `pressHold` (script.js:211–221) and
  `release` (script.js:227–238).

## Steps

1. In `styles.css:2153`, change the base transform transition from
   `transform 460ms cubic-bezier(0.34, 1.56, 0.64, 1)` to
   `transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)`.
2. In the `:hover` rule at styles.css:2216–2222, add the two-line `transition:`
   shorthand shown in Target, keeping `transition-delay: 0ms;` after it.
3. In the two neighbour rules at styles.css:2224–2229 and 2231–2235, add the same
   shorthand, keeping their existing `transition-delay: 50ms;` / `100ms;` after it.

## Boundaries

- Do NOT touch the default or `--flicker` wordmark variants, the Glissando JS, or
  the reduced-motion block at styles.css:2248–2265 (it already neutralizes piano
  and needs no change).
- Do NOT change the press-depth transforms — timing only.
- If the excerpts no longer match (drift since f9a3ae9), STOP and report.

## Verification

- **Mechanical**: valid CSS; no build step.
- **Feel check**: serve the site, open projects.html on a pointer device, scroll to
  the footer wordmark:
  - Hover a letter: it snaps down almost immediately (~130ms), no bounce on the
    way down. Move off: it springs back up with a soft overshoot (~320ms).
  - Sweep the cursor across the whole word quickly: keys depress and release under
    the cursor like running a finger down a keyboard; nothing lags behind the
    pointer, and mid-motion direction changes retarget smoothly (transitions, so
    no restarts).
  - DevTools → Animations panel at 10% speed: the downstroke shows no overshoot;
    the upstroke overshoots slightly past rest then settles.
  - Emulate a touch device and long-press/slide across the mark: the Glissando
    feel and the hover feel now read as the same instrument.
- **Done when**: press-down ≈130ms ease-out with no bounce, release ≈320ms with
  overshoot, neighbours cascade 50/100ms behind, and reduced-motion still shows
  no motion at all.
