# 3-rung safety net: rung 2 (CRF 28) and rung 3 (bitrate-capped) for overshoot

> Type: AFK
> Triage: ready-for-agent
> Slice 2 of 3

## Parent

[video-web-delivery.md](../prd/video-web-delivery.md)

## What to build

Demote GitHub's 100 MB per-file limit to a **3-rung safety net** that only
fires when the normal **Web-delivery encode** overshoots. The common case
pays nothing; the safety net only exists so an unusually long or busy clip
cannot break the upload.

After the rung 1 encode introduced in slice 1, the Admin reads `blob.size`
and only escalates if it exceeds `VIDEO_HARD_BYTES` (100 MB):

1. **Rung 1** — normal encode (CRF 23, 720p, `faster`). Virtually always
   wins. Shipped by slice 1.
2. **Rung 2** — re-encode at **CRF 28, 720p**, same preset. Tried only if
   rung 1 overshoots.
3. **Rung 3** — bitrate-capped pass with `-maxrate` / `-bufsize`, derived
   from the clip duration and `VIDEO_CAP_BYTES` (95 MB) — the old
   duration-based bitrate math, preserved solely as the last-resort rung
   and guaranteed under 100 MB. `videoDuration()` is kept because rung 3
   needs it.

The escalation is transparent: the *why* of a re-encode is legible (rung
1 → rung 2 → rung 3), not a mystery. `ff.on('progress')` continues to drive
the Admin's progress bar across each rung.

**Out of scope for this slice:** the normal-path encode itself (slice 1)
and the ADR (slice 3). The Mosaic, photo → WebP, ZIP, and Manifest paths
are untouched.

## Acceptance criteria

- [ ] A clip whose rung 1 encode lands above 100 MB triggers rung 2
      (CRF 28, 720p) automatically; no manual flags required.
- [ ] A clip whose rung 2 encode *still* lands above 100 MB triggers rung 3
      (bitrate-capped with `-maxrate` / `-bufsize`) and the final blob is
      under `VIDEO_HARD_BYTES` (100 MB).
- [ ] A clip on the common path (rung 1 ≤ 100 MB) never enters rung 2 or
      rung 3 — the safety net only fires on overshoot.
- [ ] No upload ever fails for size: the rung 3 output is guaranteed under
      100 MB on every input the pipeline accepts.
- [ ] `videoDuration()` is preserved and used only by rung 3's bitrate
      math; no other path depends on it.
- [ ] `VIDEO_HARD_BYTES` (100 MB) remains the safety-net trigger;
      `VIDEO_CAP_BYTES` (95 MB) remains the rung 3 bitrate-math input
      (no longer a passthrough threshold — set up by slice 1).
- [ ] The Admin progress bar continues to move smoothly through each rung
      the pipeline runs.
- [ ] Mosaic, photo → WebP, ZIP packaging, and Manifest regeneration are
      unchanged.

## Blocked by

- [Slice 1 — Rung 1: always-transcode at 720p / CRF 23, drop the passthrough](05-rung-1-always-transcode-720p-crf23.md)
