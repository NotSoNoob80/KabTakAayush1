# 0012 — Gallery videos ship as a 720p Web-delivery encode; 100 MB is a safety net, not a quality target

- Status: Accepted
- Date: 2026-06-17

## Context

[The Mosaic](../../mosaic.js) plays every gallery video as a muted, looping,
inline tile (`autoplay loop muted playsinline preload="metadata"`). The
visitor never sees a poster, never fullscreens it, never hears it by
default — the video tile is the moving counterpart of a contact-sheet
photo. On a phone, on an Indian mobile link, this is the surface the whole
project's first impression scrolls past.

For years the Admin's video pipeline optimized for exactly the wrong
contract. The path was:

1. **Short-circuit.** Any clip under ~95 MB shipped **byte-for-byte**.
   So the typical 20–60 MB phone clip — the *common* case — was never
   optimized at all. The Mosaic was fed the source file.
2. **Ceiling-filling transcode.** When a clip exceeded the threshold, the
   Admin computed a bitrate from the clip's duration so the output landed
   *just under* GitHub's 100 MB per-file limit, capped at 1080p, on
   `libx264 -preset medium`. 100 MB — a *hosting* constraint — was being
   treated as the *quality target*. Encodes dragged, and the file the
   visitor downloaded was tuned for fidelity they would never see on a
   phone autoplay loop.

Photos already solved this years ago: every project photo is normalized
on the way in to a small web-tuned WebP (the **WebP convention**). Video
was the only asset class still shipping at source quality.

We considered four other angles and rejected them:

- **A 1080p tier.** Nothing on this site renders video at 1080p. The
  Mosaic plays muted inline tiles, the Listing/Void don't play video at
  all. 720p is the biggest single lever for both file size and encode
  time and is indistinguishable on a phone autoplay loop.
- **A frame-rate cap.** Films are first-class on this site (the
  `isFilmOnly` projects). A 60fps pan must stay 60fps. Frame rate is the
  one knob that visibly hurts motion, so we leave it alone.
- **Stripping audio.** The Mosaic's tap-to-unmute is a real feature.
  Audio kept (just smaller — AAC 96k) costs effectively nothing now that
  the video stream is tiny.
- **Multi-threaded `ffmpeg.wasm` (COOP/COEP cross-origin isolation).**
  The Reach v23 de-jank regression burned this path (see memory
  *reach-v23-dejank-regression*). The speed-up we need here comes from
  the encode settings, not from threading; the hosting stays plain
  static.

HLS / DASH adaptive streaming was also considered and rejected — the
site is static GitHub Pages and sub-10 MB tiles do not need it.

## Decision

> **All gallery videos are normalized to a 720p Web-delivery encode —
> load speed on Indian mobile is prioritized over source fidelity, and
> GitHub's 100 MB per-file limit is a safety net, not a quality target.**

The **Web-delivery encode** is the durable contract:

- **Constant-quality**, not bitrate-ceiling-filling.
- **720p-capped**, never upscaling a smaller source, preserving aspect
  on vertical (9:16) and widescreen (16:9) inputs alike.
- **Fast-start MP4** (`+faststart` / moov atom up front) so playback
  begins before the file finishes downloading.
- **Audio kept**, not stripped, so the Mosaic's tap-to-unmute remains a
  real feature.

GitHub's 100 MB limit is demoted to a 3-rung overshoot-only safety net.
The common case is one encode and pays nothing for the safety net; the
safety net only exists so an unusually long or busy clip cannot break
the upload:

1. **Rung 1** — the normal Web-delivery encode. Virtually always wins.
2. **Rung 2** — re-encode at a tighter constant quality, same shape.
3. **Rung 3** — bitrate-capped pass derived from the clip's duration
   (the *old* ceiling-filling math, preserved solely as this last rung
   because it is guaranteed under 100 MB).

The Web-delivery encode is named in [CONTEXT.md](../../CONTEXT.md) under
*Authoring & assets*, next to the **WebP convention** it mirrors.

### The contract vs. the numbers

The numbers — CRF 23, `-preset faster`, AAC 96k, 720p cap — are the
chosen starting point, not the contract. They are expected to be tuned
with real clips on a real phone on a real Indian mobile link, and the
encode is intentionally written so any of them can move without
breaking the contract. **The contract is: constant-quality,
720p-capped, fast-start MP4 with audio kept.** A future maintainer
retuning the knobs should preserve that shape; replacing libx264 with
a different codec, or removing audio, or adding a 1080p tier, is the
kind of change that should re-open this ADR.

## Consequences

- Typical phone clips (20–60 MB, 1080p source) land at single-digit MB,
  indistinguishable on a phone autoplay loop. The Mosaic stops stalling
  when the visitor scrolls into video tiles.
- Admin encodes finish meaningfully faster end-to-end. The progress bar
  wiring is unchanged.
- Every video on the site is now web-fast — not just the ones that
  happened to exceed the old size threshold. The "this video was
  skipped" code path is gone, and so is the inconsistency it caused.
- Films stay first-class. 60fps motion is preserved end-to-end. Audio
  remains available for tap-to-unmute.
- No 1080p tier exists for video on this site. A future maintainer
  reading "why is no video here 1080p?" reads this ADR rather than
  inferring an oversight from ffmpeg flags.
- The blast radius is Admin-pipeline-only. The Mosaic, the photo → WebP
  pipeline, the ZIP packaging, the Manifest regeneration step, and the
  Void / Listing / Projects index are all untouched.
- **Not** addressed by this ADR: back-filling existing project videos
  already committed to the repo. Those keep their old encode until they
  are re-imported through the Admin. A separate optional pass can
  re-run them through the new pipeline.

See [video-web-delivery PRD](../prd/video-web-delivery.md) and
[plan-video-web-delivery.md](../../plan-video-web-delivery.md) for the
implementer's view.
