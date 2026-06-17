# ADR 0012 — Web-delivery encode contract

> Type: HITL
> Triage: ready-for-agent
> Slice 3 of 3

## Parent

[video-web-delivery.md](../prd/video-web-delivery.md)

## What to build

Author `docs/adr/0012-video-web-delivery-encode.md` capturing the
architectural decision behind this PRD, so a future maintainer reads
*"why is no video on this site 1080p?"* in the ADR record rather than
inferring it from ffmpeg flags.

The decision to record:

> All gallery videos are normalized to a 720p **Web-delivery encode** —
> load speed on Indian mobile is prioritized over source fidelity, and
> GitHub's 100 MB limit is a safety net, not a quality target.

The ADR should follow the existing format in `docs/adr/` (see ADRs 0001
through 0011 for shape and tone) and cover at minimum:

- **Context** — the Mosaic plays muted inline autoplay-loop tiles; the
  visitor pays for 1080p they never see; the Admin's compression step
  treated GitHub's 100 MB ceiling as the quality target rather than the
  hosting limit it is.
- **Decision** — every gallery video is a **Web-delivery encode**: 720p
  H.264, constant-quality, fast-start, AAC audio kept. The 100 MB limit
  is demoted to a 3-rung safety net that only fires on overshoot.
- **Consequences / trade-offs deliberately accepted:**
  - No 1080p tier — nothing on this site ever needs it.
  - No frame-rate cap — films are first-class; a 60fps pan stays 60fps.
  - Audio kept (not stripped) — the Mosaic's tap-to-unmute remains a real
    feature.
  - Single-threaded `ffmpeg.wasm` on plain static hosting stays — the
    speed-up comes from the encode settings, not from threading
    (the v23 de-jank regression burned the COOP/COEP path).
  - Specific numbers (CRF 23, `preset faster`, AAC 96k, 720p cap) are the
    chosen starting point, not the contract — they may be retuned at
    build. The **contract** is constant-quality, 720p-capped, fast-start
    MP4 with audio kept.

This slice is marked HITL because the ADR locks in trade-offs (no 1080p
tier, no frame-rate cap, no multi-thread `ffmpeg.wasm`) that future
maintainers will read as deliberate — the framing and consequences need
human sign-off, not just an agent draft.

The **Web-delivery encode** term is already defined in `CONTEXT.md` under
*Authoring & assets*, alongside the **WebP convention** it mirrors — that
half of user story 17 is done; this ADR closes the other half (user
story 18).

## Acceptance criteria

- [ ] `docs/adr/0012-video-web-delivery-encode.md` exists and follows the
      format of ADRs 0001–0011 in the same folder.
- [ ] The ADR records the decision in the form *"All gallery videos are
      normalized to a 720p Web-delivery encode — load speed on Indian
      mobile is prioritized over source fidelity, and GitHub's 100 MB
      limit is a safety net, not a quality target."*
- [ ] Context section explains the Mosaic playback surface, the Indian
      mobile constraint, and why the old "fill the 100 MB ceiling"
      behaviour was the wrong contract.
- [ ] Consequences section names the deliberate trade-offs: no 1080p
      tier, no frame-rate cap, audio kept (not stripped), single-threaded
      `ffmpeg.wasm` stays.
- [ ] The ADR distinguishes the durable **contract** (constant-quality,
      720p-capped, fast-start MP4 with audio kept) from the **tunable
      numbers** (CRF 23, `preset faster`, AAC 96k) that may be retuned
      with real clips on a real phone on a real Indian mobile link.
- [ ] `CONTEXT.md`'s **Web-delivery encode** entry is updated to link to
      the new ADR alongside its existing link to
      `plan-video-web-delivery.md`.
- [ ] No code changes; documentation only.

## Blocked by

None — can start immediately (independent of slices 1 and 2, though
logically pairs with them).
