# Rung 1: always-transcode at 720p / CRF 23, drop the passthrough

> Type: AFK
> Triage: ready-for-agent
> Slice 1 of 3

## Parent

[video-web-delivery.md](../prd/video-web-delivery.md)

## What to build

Flip the Admin's video pipeline from *"fill the 100 MB ceiling"* to *"hit a
fixed web-quality target"*. Every video the Admin imports becomes a
**Web-delivery encode** — a 720p H.264 MP4 tuned for fast playback on Indian
mobile, the motion counterpart to the **WebP convention** for photos.

The normal encode (rung 1, the only path this slice introduces):

- 720p cap, applied as `min(1280, iw) × min(720, ih)` with
  `force_original_aspect_ratio=decrease`, so vertical and widescreen clips
  both land at the correct aspect and a sub-720p source is never upscaled.
- `libx264 -preset faster -crf 23` — visually transparent on a phone
  autoplay loop, roughly twice as fast as `medium`.
- `-pix_fmt yuv420p -movflags +faststart` — playback begins before download
  completes, which matters most on slow links.
- `-c:a aac -b:a 96k` — audio kept (Mosaic still supports tap-to-unmute),
  just smaller.

The old `FACTORS` / `totalK` / `videoK` duration-based bitrate math leaves
the normal path. It survives only as future rung 3's helper.

The "under ~95 MB ⇒ ship the source byte-for-byte" short-circuit is also
removed: every video flows through `compressVideo`, no exceptions, no
"this video was skipped" code path. A clip already smaller than the CRF
target passes through near-untouched; the point is one predictable path.

The Admin's done-notice wording is updated to describe the new contract —
"optimized for fast web playback at 720p" — rather than the historical
"compressed to fit under 100 MB". `VIDEO_CAP_BYTES`'s declaration comment is
narrowed so a future reader does not mistake it for the old passthrough
threshold; the constant itself stays for rung 3's bitrate math.

`ff.on('progress')` wiring is unchanged — the existing progress bar still
moves smoothly through the encode.

**Out of scope for this slice:** the overshoot safety net (rungs 2 and 3) —
see slice 2. The Mosaic, the photo → WebP pipeline, the ZIP packaging, and
the Manifest regeneration are untouched by hard contract.

## Acceptance criteria

- [ ] A typical phone clip (20–60 MB, 1080p source) dropped into the Admin
      lands at 720p, single-digit MB, and runs the autoplay loop in the
      Mosaic indistinguishably from the source on a phone.
- [ ] A clip already smaller than the CRF target still passes through
      `compressVideo` (no byte-for-byte shortcut) and the output is still
      720p / well under 100 MB.
- [ ] A vertical 9:16 clip and a widescreen 16:9 clip both land at the
      correct aspect and are never upscaled beyond their source.
- [ ] A 60fps film-only clip stays 60fps end-to-end (verify with `ffprobe`);
      no frame-rate cap is introduced.
- [ ] A clip with audio still has an AAC track in the output and is audible
      and intelligible on a phone after tap-to-unmute in the Mosaic.
- [ ] With network throttled to Slow 3G in DevTools, video tiles begin
      playing **before** the file has finished downloading (`+faststart`
      verified).
- [ ] A clip that previously took N seconds at `medium` / 1080p / ~100 MB
      output is meaningfully faster end-to-end; the Admin progress bar
      still moves smoothly through the encode.
- [ ] The Admin's success message reads "optimized for fast web playback at
      720p" (or equivalent wording matching the new contract), not the
      historical "compressed to fit under 100 MB".
- [ ] `VIDEO_CAP_BYTES`'s declaration comment makes its narrowed role
      explicit (no longer a passthrough threshold).
- [ ] Mosaic regression: every video tile still autoplays, loops, is muted
      by default, plays inline, and respects the visibility play/pause
      observer; one-unmuted-at-a-time behaviour is unchanged.
- [ ] Photo → WebP, ZIP packaging, and Manifest regeneration are unchanged:
      a project containing both photos and videos still packages and
      re-indexes exactly as before.

## Blocked by

None — can start immediately.
