# 006 — Reach UI: onboard stagger, CTA press feedback, reticle fade-in

- **Status**: TODO
- **Commit**: 62fd172
- **Severity**: LOW (additive polish — from `find-animation-opportunities`)
- **Category**: Delight (rare tier) + Feedback + Preventing a jarring change
- **Estimated scope**: 1 file (index.html inline `<style>` block), 3 independent edits

Three small opportunities, all in the Reach's inline CSS on index.html, merged into one
plan per the one-file rule. They are independent — any subset can ship.

**Reduced-motion note (applies to all three):** The Reach never runs under
`prefers-reduced-motion: reduce` — the CTA is hidden by CSS (index.html:556–558) and the
JS never wires it (`REACH_PREFERS_REDUCED` gate, index.html:1552–1555). All three
additions are therefore exempt-by-construction; add no `@media` handling.

---

## Part A — Stagger the onboarding lines (Delight, rare tier)

### Problem

Turning on The Reach is the site's highest-emotion moment — camera on, hand found,
superpowers granted — and the three instruction lines ("Push forward… Pull back… Make a
fist…") fade in as one flat block:

```css
/* index.html:453–468 — current (container only; lines have no motion) */
    .reach-onboard {
      position: fixed;
      top: 38%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 21;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      pointer-events: none;
      text-align: center;
      opacity: 0;
      transition: opacity 0.8s ease;
      color: var(--gold, #c5a44c);
    }
    .reach-onboard.is-visible { opacity: 0.85; }
```

This is exactly the rare/first-time tier where the delight budget lives, and a stagger
here also *aids* function: the lines are instructions, and arriving top-to-bottom
enforces reading order.

### Target

Add after the `.reach-onboard.is-visible` rule (index.html:469):

```css
    /* Onboard lines arrive top-to-bottom — a small rise + fade per line,
       90ms apart, so the instructions read in order. Exit is undecorated:
       when .is-visible drops, the delay rules stop applying and all lines
       leave together under the container's 0.8s fade. */
    .reach-onboard__line {
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 400ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
                  transform 400ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
    }
    .reach-onboard.is-visible .reach-onboard__line {
      opacity: 1;
      transform: translateY(0);
    }
    .reach-onboard.is-visible .reach-onboard__line:nth-child(2) { transition-delay: 90ms; }
    .reach-onboard.is-visible .reach-onboard__line:nth-child(3) { transition-delay: 180ms; }
```

The delays live only under `.is-visible` on purpose — entrance staggers, exit doesn't.

---

## Part B — Press feedback on the Reach CTA (Feedback)

### Problem

The gold "The Reach" pill (the most consequential button on the site — it asks for
camera access) has hover/fill states but no press acknowledgment:

```css
/* index.html:254 — current transition list (no transform) */
      transition: opacity 0.7s ease, color 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
```

Every other button on the site presses (`.btn`, `.back-btn`, `.mosaic__sound`,
`.mosaic-preview__close` — all `scale(0.97)`).

### Target

1. Extend the transition list at index.html:254 (add the transform entry; keep the rest
   byte-identical):

```css
      transition: opacity 0.7s ease, color 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, transform 160ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
```

2. Add after the `.reach-cta.is-failed` rule (index.html:282):

```css
    .reach-cta:active { transform: scale(0.97); }
```

3. **Compose-trap (required):** on mobile the CTA is *centred via transform*
   (`transform: translateX(-50%)` at index.html:533, and `.reach-cta.is-on` resets to
   `transform: none` at index.html:548). A bare `:active` scale would replace the
   centring and jump the pill sideways on press — the same trap
   `.mosaic-preview__nav:active` already solves by composing (styles.css:2732). Inside
   the existing `@media (max-width: 767px), (pointer: coarse)` block that holds those
   rules, add after the `.reach-cta.is-on` override:

```css
      .reach-cta:active { transform: translateX(-50%) scale(0.97); }
      .reach-cta.is-on:active { transform: scale(0.97); }
```

---

## Part C — Fade the reticle in (Preventing a jarring change)

### Problem

When The Reach turns on, the gold reticle pops into existence dead-centre via a
`display` flip:

```css
/* index.html:321–343 — current (excerpt) */
    .reach-reticle {
      ...
      pointer-events: none;
      display: none;
      transform: translate(0, 0);
      will-change: transform;
      transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }
    .reach-reticle.is-on { display: block; }
```

Its own hand glyphs already fade/scale in over 150ms (index.html:368); the container
appearing instantly is the one unbridged appearance in the sequence.

### Target — opacity only, NEVER transform

**Hard constraint:** the reticle's `transform` is rewritten every rendered frame by JS
(`reach.reticleEl.style.transform = 'translate(…)'`, index.html:2090). Putting
`transform` in its transition list would make every per-frame write a new 150ms
transition target — the cursor would lag and rubber-band. The entrance must be
opacity/visibility only.

Replace the two rules above with:

```css
      pointer-events: none;
      visibility: hidden;
      opacity: 0;
      transform: translate(0, 0);
      /* The reticle's transform is rewritten every rendered frame while The
         Reach is on — promote it to its own compositor layer so each move is
         composite-only, never a repaint over the canvas. Do NOT add transform
         to this transition list: per-frame JS writes would each retarget a
         transition and the cursor would lag. Opacity-only entrance. */
      will-change: transform;
      transition: opacity 150ms ease, visibility 0s linear 150ms, background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }
    .reach-reticle.is-on {
      visibility: visible;
      opacity: 1;
      transition: opacity 150ms ease, visibility 0s, background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }
```

(The original comment block above `will-change` stays; only the quoted declarations
change. `visibility` replaces `display` so the transition can run; the delayed
`visibility` flip on the off state keeps it unpaintable and out of the way once faded.)

## Boundaries

- index.html's inline `<style>` block only. Do NOT touch styles.css, any JS, or the
  Reach's behavioral code.
- Do NOT add `prefers-reduced-motion` handling (see note at top — exempt by construction).
- Do NOT put `transform` in the reticle's transition list under any circumstances.
- If any quoted excerpt no longer matches (drift since 62fd172), STOP and report.

## Verification

- **Mechanical**: page loads with no console errors; the Reach still enables/disables.
- **Feel check** (needs a webcam):
  - Enable The Reach; once the hand calibrates, the three instruction lines rise in
    top-to-bottom, ~90ms apart; after ~6s they all fade out *together*.
  - Click the CTA: it dips (scale 0.97) under the cursor. On a phone/emulated touch:
    press the pill — it must dip **in place**, not jump sideways (the compose-trap).
  - On enable, the reticle fades in over ~150ms instead of popping; while steering,
    the cursor must track the hand with **zero added lag** (the transform-transition
    trap) — wave the hand fast and confirm the reticle keeps up exactly as before.
- **Done when**: all three motions read in slow motion (DevTools Animations panel at
  10%), and reticle tracking latency is indistinguishable from before the change.
