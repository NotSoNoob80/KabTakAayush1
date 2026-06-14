# (Optional) Extract texture mapping into a testable pure function

> Type: AFK
> Triage: optional / nice-to-have
> Slice 4 (optional)

## Parent

[void-mobile-density-prd.md](../void-mobile-density-prd.md)

## What to build

> **Optional.** The PRD flags this as recommendation, not blocker. The repo has
> no test harness today, so the seam only fully pays off if a runner is also
> introduced. Skip if there's no appetite to set one up.

Lift the mobile texture-mapping logic out of the layout IIFE into a named pure
function and assert its invariants in unit tests. The function takes the field
parameters (slots, texture budget, reel count) and returns the per-frame
texture assignment; the inline call site uses its return value to fill
`layouts[].tex`.

This is the only part of the feature whose invariants are *exact* rather than
visual, so it's the highest seam available for automated tests. The visual /
fps guarantees still rest on the manual passes in slice 3 — this slice does
not replace them.

Invariants worth asserting:

- The set of distinct textures used has size ≤ `texBudget` (memory stays flat).
- Every sampled index is in `[0, reelCount)` and spreads across the full reel
  (variety preserved).
- No frame shares a texture with an immediate Z-band neighbour (duplicates not
  adjacent).
- Called with desktop parameters, the assignment equals `i % reelCount`
  (desktop path provably unchanged).

If no test runner is set up as part of this slice, leave the function in place
without tests — the extraction alone makes the logic reusable and clearer.

## Acceptance criteria

- [ ] Texture-mapping logic lives in a named pure function with a clear
      signature, not inlined in the layout IIFE.
- [ ] The inline call site uses the function's return value; behaviour for both
      mobile and desktop is unchanged from the prior slices.
- [ ] (If a runner is set up) The four invariants above are asserted by tests
      that import only the pure function — no THREE.js, no DOM.
- [ ] No new terms added to [CONTEXT.md](../../CONTEXT.md).

## Blocked by

- Slice 1: [Split constants and route mobile textures through a budget-sized sample](01-split-constants-route-textures-through-budget.md)
