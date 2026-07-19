# Animation audit — KabTakAayush portfolio

- **Audited at commit**: f9a3ae9 (2026-07-19)
- **Produced by**: `improve-animations` (full workflow: recon → 8-category audit → vet → plans)
- **Scope**: every live page (index.html Void, projects.html, project.html, about.html) plus
  shared CSS/JS. `admin.html` (internal tool, rare frequency), `index-classic.html` and its
  reel (orphaned — zero inbound references), and `gallery.js` (deprecated no-op) were
  inspected and deliberately excluded from findings.
- **Honesty note**: this audit is a code read, not a live-browser session. Each plan carries
  its own feel-check protocol; nothing below claims a measured FPS/feel result.

## Verdict

This is one of the most disciplined motion codebases this audit has seen: easing tokens,
near-universal reduced-motion handling, transform/opacity-only animation, framerate
compensation (`MOTION_DT_COMP`), rest fast-paths, and documented tradeoffs everywhere
(ADRs, de-jank history). **The motion here is largely already right.** The findings below
are the residue: one real bug, two places where implementation drifted from documented
intent, one system that missed the framerate-independence pass, and small polish.

Settled decisions respected (audited, deliberately NOT re-litigated): the Void's intro/
chase/One-Euro/rVFC architecture (ADR 0010/0011 + de-jank history), gate shear skipped on
video mosaics (lever A), the About scrub kept on phones (ADR 0003), film-grain overlays,
the 520–900ms gallery reveal pacing (marketing-surface budget), The Hour not gating on
reduced motion (documented: it is not motion).

## Findings

| # | Severity | Category | Location | Finding | Fix |
| --- | --- | --- | --- | --- | --- |
| 1 | HIGH | Correctness | script.js:1407 | `indexItems` is never defined → ReferenceError on every projects.html load; kills the idle egg, the secret `a t 8 0` egg, and all wiring after it | [001](001-fix-indexitems-referenceerror.md) |
| 2 | MEDIUM | Accessibility | styles.css:341–359 | `[data-reveal]` (site-wide entrance utility) animates translateY(20px) + blur(4px) with no `prefers-reduced-motion` path — the only motion system in the repo without one | [002](002-data-reveal-reduced-motion.md) |
| 3 | MEDIUM | Interruptibility / asymmetric timing | styles.css:2148–2154 | Piano wordmark press-down uses the release's 460ms overshoot spring; the touch Glissando (the documented "same instrument") strikes in 130ms | [003](003-piano-press-strike-asymmetry.md) |
| 4 | MEDIUM | Performance / cohesion | mosaic.js:738–994 | Living-Mosaic engine (frame drift ×2, gate shear) uses raw per-frame eases — the one rAF system without dt compensation; stiffer on 120Hz+, sluggish under FPS dips | [004](004-mosaic-motion-dt-comp.md) |
| 5 | LOW | Missed opportunity | mosaic.js:198–267 | Preview prev/next hard-cuts the stage: blank gap then pop-in on slow loads, in the page's core browsing loop | [005](005-mosaic-preview-swap-fade.md) |
| 6 | LOW | Performance | styles.css:2084 | `will-change: transform` declared *inside* `.footer__wordmark .char:hover` — promotion lands on the same frame the transition starts (defeats the point). Fix: delete the line; tiny glyph transforms don't need pre-promotion. No plan — one line. |
| 7 | LOW | Cohesion / tokens | index.html:41, 92, 105… | Void inline CSS re-hardcodes the `--ease-out` curve as a literal and uses gold fallbacks (`#c5a44c`) that differ from brand `--gold` (`#e3b23c`); harmless while styles.css loads, silent brand drift if it ever doesn't. No plan — tidy opportunistically. |

### Vetted and rejected (do not re-flag)

- Void hint/CTA fades using bare `ease` at 0.5–0.9s — opacity-only atmospheric fades on a
  cinematic surface; within budget for the decision order (`ease` for color/opacity).
- `#void-grain` / `.grain` infinite `steps(2)` jitter — brand texture, compositor-only,
  reduced-motion gated (index.html:225).
- Mosaic tile settle 900ms / reveal 520ms / index-row cascade — gallery-surface pacing,
  deliberate and documented.
- listing.js scroll scrub — dt-clamped, rest fast-path, write-cached; already exemplary.
- `.mosaic-preview` centered scale-open — modals are exempt from trigger-origin rules.
- JS `.btn` pointerdown scale duplicating CSS `:active` — redundant but harmless
  (touch-reliability belt); not worth churn.
- **Piano wordmark symmetric press timing (finding 3) — owner-rejected 2026-07-20.**
  The 130ms-strike/320ms-spring asymmetry was implemented, feel-checked by the owner,
  and reverted: the slow 460ms spring both ways is the intended "smooth and bouncy"
  personality of the mark. Now a settled taste decision — do not re-flag.

## Missed opportunities (beyond plan 005)

Additive, unplanned — pick up only if wanted:

1. **Universal sound toggle pops in** (mosaic.js:702): injected into the page head after
   grid build with no entrance — a one-class fade+rise (~200ms, `--ease-out`) would stop
   the late layout pop.
2. **Nav underline retract origin** (styles.css:194–210): the hover underline grows from
   the left and shrinks back to the left; flipping `transform-origin` to `right` in the
   non-hover state makes it wipe through — a classic one-line polish.
3. **Cross-page continuity**: the projects list → project page jump is a full teleport.
   Cross-document View Transitions (`@view-transition { navigation: auto; }` + a
   `view-transition-name` on the clicked row/title) are a progressive enhancement that
   would let the title morph across the navigation in supporting browsers. Bigger bite;
   prototype behind a review.

## Execution order

Plans are independent — no ordering dependencies. Recommended by leverage:

| Order | Plan | Severity | Status |
| --- | --- | --- | --- |
| 1 | [001 — Fix the `indexItems` ReferenceError](001-fix-indexitems-referenceerror.md) | HIGH | DONE |
| 2 | [002 — `[data-reveal]` reduced-motion path](002-data-reveal-reduced-motion.md) | MEDIUM | DONE |
| 3 | [003 — Piano press strike asymmetry](003-piano-press-strike-asymmetry.md) | MEDIUM | REVERTED — owner taste |
| 4 | [004 — Living-Mosaic dt compensation](004-mosaic-motion-dt-comp.md) | MEDIUM | DONE |
| 5 | [005 — Preview swap-when-ready + fade](005-mosaic-preview-swap-fade.md) | LOW | DONE |

All five executed 2026-07-19 against commit f9a3ae9. Verified live on localhost:8123:
projects.html loads with a clean console and the post-1407 wiring fires again (secret-egg
toast confirmed); the RM `[data-reveal]` rule and both piano timings are in the parsed
CSSOM and compute to 130ms strike / 320ms spring; the Mosaic engine was driven with
controlled timestamps — a dtN=2 tick advances ×1.69 vs the ×0.88 an uncompensated tick
would, and the engine still decays to rest and sleeps; preview arrow-nav swaps with the
fade classes applied and the stage never emptied, and close/teardown is intact. Not yet
exercised (environment limits): on-device hover feel, a real 120Hz display, and the
slow-network hold path — see each plan's feel-check protocol.

To execute one: `improve-animations execute <plan>` (dispatches an executor + reviews the
diff), or hand the plan file to any agent — each plan is self-contained, carries exact
current-code excerpts, target code, boundaries, and a feel-check protocol. After code
changes land, run `improve-animations reconcile` to refresh statuses and stale line refs.
