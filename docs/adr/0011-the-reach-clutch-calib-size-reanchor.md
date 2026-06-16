# 0011 — The Reach: re-anchor `calib.size` on every `clutched → open` transition

- Status: Accepted
- Date: 2026-06-16

## Context

[The Reach](../prd/the-reach.md) maps apparent hand size to `camTarget.z` via
a per-visitor calibrated neutral: `calib.size` is the mean wrist→middle-MCP
distance captured during the 12-sample calibration window when the visitor
first shows an open palm. Every frame, the depth contribution is
`ds = hand.size - calib.size`, scaled by `REACH_FLY` and added to
`camTarget.z`. The calibration is open-palm by construction.

[The Reach: the clutch](../prd/the-reach-clutch.md) adds a third gesture —
the closed fist — that pins depth while leaving pan live. While the visitor
holds the clutch, `hand.size` is the *fist's* apparent size, which is by
definition smaller than the open-palm `calib.size` recorded during the
initial calibration. The depth contribution is suppressed while clutched, so
nothing goes wrong during the hold. The problem is the moment of *release*.

On the first frame after `clutched → open`, the hand has just unfolded back
to a palm but the smoothed `hand.size` has not yet caught up. Worse — even
after smoothing settles, `calib.size` was captured when the hand was at
*one* distance from the camera; the visitor may have shifted forward or
backward during the clutch, or the depth they committed to was reached by
flying through the field, so their open palm is no longer the same apparent
size it was at calibration. Without intervention, the first open-palm frame
after release reads as "the hand is way bigger (or smaller) than neutral"
and the camera jerks forward (or backward) — undoing the whole point of
committing to a depth.

The temptation is to clamp the depth contribution, low-pass it harder, or
introduce a release tween. Each one is a workaround. The honest fix is to
acknowledge that `calib.size` is *no longer the right anchor* — the
visitor's "neutral open palm" has moved.

## Decision

On every `clutched → open` transition, the first detection sample after the
state machine returns to `open` replaces `calib.size` with that sample's
size. The other calibration fields (`calib.x`, `calib.y`, `calib.curl`) are
left alone.

Concretely: when the dwell-gated `clutched → open` transition fires, a flag
is set on the Reach state object. On the next `reachDetect()` call after
that flag is set, `calib.size` is overwritten with the smoothed size of the
arriving sample, and the flag is cleared. The depth delta on that frame is
therefore ≈ 0, and the camera does not jerk.

This is consistent with [ADR 0010](0010-the-reach-additive-camtarget-writer.md)'s
"rate, not absolute" mapping: the absolute depth reference was already
allowed to drift over time (camTarget.z integrates deltas, it is not
clamped to any calibrated zero). The clutch makes that drift legible to
the visitor — the moment of re-anchoring becomes a single deterministic
frame the visitor explicitly authored by opening their hand — rather than
a slow integration error nobody can point at.

`calib.x` and `calib.y` are *not* re-anchored on this transition: the pan
neutral is "where the hand sits in the camera frame", and during a clutch
the visitor is panning around with the same hand — the pan neutral is the
same hand-in-frame position it was before the clutch, not a new one. Only
the size has visibly drifted because of the fist.

`calib.curl` is also not touched: the open-palm curl mean captured during
the original 12-sample calibration window remains the visitor's openness
neutral; that has not drifted.

## Consequences

- Opening the fist after a clutch resumes depth steering from wherever the
  visitor's hand now sits, with no visible jerk forward or backward. This
  is the one behaviour the clutch ships to deliver, and the re-anchor is
  what makes it deliver it.
- `calib.size` is now mutable after initial calibration. Anywhere that
  reads it should assume it is the *current* depth anchor, not the
  permanent one. In practice only `reachApplyToTarget()` reads it.
- Tracking-loss recovery beyond `REACH_LOSS_HINT_MS` re-anchors *all of*
  `calib.{x, y, size, curl}` (see the clutch PRD's tracking-loss section);
  that path is unaffected by this ADR — it is the long-loss recalibration,
  not the per-transition one this ADR governs.
- A future gesture that involves any deformation of the hand shape (a
  half-curl held intentionally, a thumbs-up, a pointer) would face the
  same anchor-drift problem on release. If one is added, the right move is
  to re-use the per-transition re-anchor pattern from this ADR rather than
  introduce a parallel clamp or tween.
- The state object gains one short-lived boolean (`reach.recalibSizeOnNext`)
  that lives for at most one detection sample. Teardown clears it.
