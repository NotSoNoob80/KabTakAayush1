# Plan — Video web-delivery encode (small, fast in India)

## Goal

Make gallery videos **load fast on Indian mobile** without a drastic quality
drop, and make the **Admin's compression step much quicker**. Today the Admin
optimizes videos for exactly the wrong thing: it fills GitHub's 100 MB ceiling
to maximize fidelity, then those 1080p files autoplay as inline loops on phones.

This plan flips the encoder from *"fill the ceiling"* to *"hit a fixed
web-quality target"* — file size becomes a consequence of the clip's own
complexity, not a budget to consume.

## Problem (what the code does today)

- **The Admin** (`admin.html`) transcodes a video only if it is **over ~95 MB**;
  anything smaller ships **byte-for-byte** ([admin.html:1424](admin.html:1424)).
  So the common case — a 20–60 MB phone clip — is never optimized.
- When it *does* transcode, it computes a bitrate from the clip's duration so the
  output lands **just under 100 MB**, capped at **1080p**, on `-preset medium`,
  single-threaded `ffmpeg.wasm` ([admin.html:882](admin.html:882)). Both the
  large output and the slow preset make encoding drag.
- **The Mosaic** (`mosaic.js`) plays these as **autoplay, looping, muted, inline**
  tiles ([mosaic.js:392](mosaic.js:392)) — the worst case to feed a 100 MB 1080p
  file. `preload="metadata"` is already set (good — keep it).

100 MB is **GitHub's hard per-file limit** (a *hosting* constraint), not a
quality goal. This plan demotes it to a safety net.

## Decisions (locked via grill)

1. **Quality-based (CRF) encode, not ceiling-filling.** Drop the
   bitrate-from-duration math. Encode every video at a constant quality; size
   falls out naturally (typically **3–8 MB** instead of ~100 MB).
2. **Cap resolution at 720p** (`min(1280, iw)` × `min(720, ih)`,
   `force_original_aspect_ratio=decrease` so it never upscales). Biggest single
   lever — roughly halves both size and encode time vs 1080p, and is
   indistinguishable on a phone autoplay loop.
3. **CRF 23** — libx264's "visually transparent" default. Quality-leaning.
4. **`-preset faster`** — ~2× quicker than `medium`; the ~5–10% size cost is
   noise now that 720p + CRF do the heavy lifting.
5. **Audio: AAC 96k** (down from 128k) — inaudible on phone speakers; meaningful
   saving now that the video stream is tiny. Videos can still be unmuted on tap
   in the Mosaic, so audio is kept, not dropped.
6. **No frame-rate cap.** Films are first-class here (`isFilmOnly`,
   [mosaic.js:68](mosaic.js:68)); a 60fps pan stays 60fps. This is the one knob
   that visibly hurts motion, so we leave it alone.
7. **Transcode *all* videos**, not just oversized ones. One predictable path;
   every video on the site is guaranteed web-fast. A clip already smaller than
   the CRF target passes through near-untouched.
8. **100 MB demoted to a 3-rung safety net** that only fires on overshoot
   (see below). Common case never pays for it.

## Implementation

All changes are in `admin.html`. Two functions touched + one constant note.

### 1. `compressVideo` — swap the encode (replaces [admin.html:882-944](admin.html:882))

Drop the `FACTORS` / `totalK` / `videoK` bitrate math for the normal path.
New normal encode:

```
-i in.mp4
-vf scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2
-c:v libx264
-preset faster
-crf 23
-pix_fmt yuv420p
-movflags +faststart
-c:a aac -b:a 96k
-y out.mp4
```

`+faststart` (moov atom up front) stays — it's what lets playback begin before
the file finishes downloading, which matters most on slow links.

### 2. The 3-rung safety net (overshoot only)

Encode, read `blob.size`, and only escalate if it exceeds `VIDEO_HARD_BYTES`
(100 MB):

1. **CRF 23, 720p** — normal path; virtually always wins.
2. **CRF 28, 720p** — re-encode only if rung 1 > 100 MB.
3. **`maxrate`-capped pass** — last resort, guaranteed under 100 MB. This is the
   *old* duration math, kept solely for rung 3: derive `videoK` from
   `VIDEO_CAP_BYTES` (95 MB) and the clip duration, with `-maxrate`/`-bufsize`.
   Keep `videoDuration()` ([admin.html:866](admin.html:866)) — rung 3 needs it.

`ff.on('progress')` wiring is unchanged, so the Admin progress bar still works.

### 3. Always-transcode trigger (replaces [admin.html:1424-1428](admin.html:1424))

Remove the `if (g.file.size <= VIDEO_CAP_BYTES) { ship byte-for-byte }`
short-circuit. Every video goes through `compressVideo`. Update the comment and
the done-notice wording at [admin.html:1446](admin.html:1446) (no longer "to fit
under 100 MB" — now "optimized for fast web playback (720p)").

### 4. Constants

`VIDEO_HARD_BYTES` (100 MB) stays — it's the safety-net trigger.
`VIDEO_CAP_BYTES` (95 MB) is now used *only* by rung 3's bitrate math, not as a
passthrough threshold. Rename/comment it so its narrowed role is clear.

## Glossary impact (CONTEXT.md)

Today's glossary says *"Only videos keep their original MP4 files"* — false under
this plan. Updated inline: videos are now normalized to a **720p web-delivery
MP4**, the motion counterpart to the WebP convention for photos.

## ADR candidate

Worth an ADR (hard-to-reverse-ish, surprising, real trade-off): *"All gallery
videos are normalized to a 720p web-delivery encode — load speed on Indian
mobile is prioritized over source fidelity, and GitHub's 100 MB limit is a safety
net, not a quality target."* A future reader will otherwise wonder why nothing is
1080p. Offered separately.

## What this does NOT change

- `mosaic.js` playback (autoplay/loop/muted/`preload="metadata"`) is untouched —
  it already does the right thing; it was just being fed oversized files.
- Photo → WebP pipeline, ZIP packaging, and Manifest regeneration are untouched.
- Single-threaded `ffmpeg.wasm` on plain static hosting (no COOP/COEP) stays.
