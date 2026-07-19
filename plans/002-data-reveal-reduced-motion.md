# 002 — Give the `[data-reveal]` utility a reduced-motion path

- **Status**: DONE (implemented + verified 2026-07-19)
- **Commit**: f9a3ae9
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file (styles.css), ~8 added lines

## Problem

The site's generic scroll-reveal utility animates **movement + blur**, and it is the
only motion system in the repo with no `prefers-reduced-motion` handling. Every other
system opts out or gentles itself (the listing scrub returns early, listing.js:41–42;
the index rows have an explicit override, styles.css:971–977; the Reach CTA is hidden
outright, index.html:556–558). This utility was simply missed:

```css
/* styles.css:341–359 — current */
[data-reveal] {
  opacity: 0;
  transform: translateY(20px);
  filter: blur(4px);
  transition: opacity 520ms var(--ease-out),
              transform 520ms var(--ease-out),
              filter 520ms var(--ease-out);
}

[data-reveal].is-visible {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

[data-reveal-delay="1"] { transition-delay: 60ms; }
[data-reveal-delay="2"] { transition-delay: 120ms; }
[data-reveal-delay="3"] { transition-delay: 180ms; }
[data-reveal-delay="4"] { transition-delay: 240ms; }
```

script.js's IntersectionObserver (script.js:311–357) adds `.is-visible` regardless of
motion preference, so a reduced-motion visitor still gets a 520ms rise + un-blur on:
the back button, eyebrow, and description on project.html (project.html:39–46), and the
footer CTA + columns on every inner page (e.g. projects.html:43–56).

Reduced motion means *fewer and gentler*, not zero: keep the opacity fade (it aids
comprehension of "content arriving"), drop the position change and the blur.

## Target

Add one media block **immediately after** the `[data-reveal-delay="4"]` line
(styles.css:359), before the Hero section banner comment:

```css
/* Reduced motion: reveals keep their opacity fade (content still visibly
   arrives) but never move or blur. Delays are left in place — a staggered
   opacity fade is gentle and keeps the reading order legible. */
@media (prefers-reduced-motion: reduce) {
  [data-reveal] {
    transform: none;
    filter: none;
    transition: opacity 240ms var(--ease-out);
  }
}
```

## Repo conventions to follow

- Reduced-motion overrides live directly after the base rules they neutralize —
  exemplar: `.index__list li` base at styles.css:950–961 followed by its
  `@media (prefers-reduced-motion: reduce)` block at styles.css:971–977.
- Use the existing `--ease-out` token (styles.css:21). Never hardcode the curve.

## Known cascade interplay (deliberate — do not "fix")

- `.back-btn` carries `data-reveal` on project.html. The existing RM rule at
  styles.css:282–288 (`.back-btn … { transition: none; }`) has equal specificity
  (0,1,0) to the new `[data-reveal]` rule, so the **later** new block wins on the
  `.back-btn` element itself: under RM its reveal becomes a 240ms opacity fade and
  its hover color/border snap (only `opacity` is transitioned). Its `::before`
  sweep and `__arrow` keep `transition: none` from 282. This is consistent with
  the new policy — leave both blocks as they are.
- `.back-btn[data-reveal].is-floating` RM opacity transition (styles.css:319–323)
  is higher-specificity and still wins while floating. Untouched.

## Steps

1. In `styles.css`, insert the media block from **Target** verbatim after line 359
   (`[data-reveal-delay="4"] { transition-delay: 240ms; }`), keeping one blank line
   on each side.

## Boundaries

- Do NOT modify the base `[data-reveal]` rules, the delay attributes, script.js's
  observer, or any `.back-btn` rule.
- Do NOT add reduced-motion handling to anything else — other systems already have it.
- If styles.css:341–359 no longer matches the excerpt (drift since f9a3ae9), STOP and report.

## Verification

- **Mechanical**: none required beyond valid CSS (no build step). Optionally run the
  file through any CSS validator.
- **Feel check**: serve the site, open DevTools → Rendering → "Emulate CSS media
  feature prefers-reduced-motion: reduce":
  - Reload project.html and scroll: the back button, eyebrow, description, and footer
    blocks fade in **without rising and without blur** (inspect a `[data-reveal]`
    element: computed `transform` is `none` before and after `.is-visible`).
  - Toggle the emulation off, reload: the original 520ms rise + blur reveal is
    byte-for-byte unchanged.
  - In the Animations panel at 10% speed, confirm the RM reveal animates only `opacity`.
- **Done when**: under reduced motion, no `[data-reveal]` element changes `transform`
  or `filter` on reveal, and the default experience is unchanged.
