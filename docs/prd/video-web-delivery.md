# PRD — Video web-delivery encode

## Problem Statement

A visitor opens a project on a phone in India. The **Mosaic** assembles, the
photos load — they are **WebP**, sized for the web — and then the video tiles
start to fetch and the page stalls. Each video tile autoplays a muted,
looping, inline `<video>`, and each of those videos is a 1080p MP4 sitting
*just under 100 MB*, because that is what **the Admin** encoded it to be.
On a slow Indian mobile link this is the difference between a project that
reveals itself and a project that hangs.

The cause is a hosting limit dressed up as a quality target. GitHub refuses
any file over 100 MB, so the Admin's compression step treats 100 MB as the
*goal*: it computes a bitrate from the clip's duration to land the output
just under the ceiling, at 1080p, on `ffmpeg.wasm`'s `medium` preset. The
common case — a 20–60 MB phone clip — never even enters that path; it ships
byte-for-byte because it already fits. Either way the visitor pays. Either
way the Admin waits a long time at encode.

Photos solved this years ago with the **WebP convention** — every project
photo is normalized to a small, web-tuned WebP on the way in. Videos never
got the same discipline. They are the only asset class on the site still
shipped as the source file, and the Mosaic — which plays them autoplay,
looping, muted, inline — is the worst possible place to feed an unoptimized
1080p source.

## Solution

Introduce the **Web-delivery encode**: every video that enters the Admin is
normalized to a **720p H.264 MP4** tuned for fast playback on Indian mobile,
the motion counterpart to the **WebP convention** for photos. The encoder's
job changes from *"fill the 100 MB ceiling"* to *"hit a fixed web-quality
target"*. File size becomes a consequence of the clip's own complexity
rather than a budget to consume; in practice videos that landed at ~100 MB
land at 3–8 MB, indistinguishable on a phone autoplay loop.

The encode is **constant-quality** (CRF 23, libx264's "visually transparent"
default), capped at **720p** (the biggest single lever — roughly halves both
file size and encode time vs 1080p, invisible on a phone), on a **faster**
ffmpeg preset (so the Admin no longer drags), with audio re-encoded to
**AAC 96k** (inaudible on a phone speaker; meaningful saving now that the
video stream is tiny). `+faststart` stays — it is what lets playback begin
before the file finishes downloading, which matters most on slow links.

**Every** video runs through this encode, not just oversized ones. The old
"under 95 MB ⇒ ship byte-for-byte" short-circuit is gone. One predictable
path; every video on the site is guaranteed web-fast. A clip already smaller
than the CRF target passes through near-untouched.

GitHub's 100 MB limit is demoted to a **3-rung safety net** that only fires
on overshoot. Rung 1 is the normal path. If the output exceeds 100 MB, the
Admin re-encodes at CRF 28 (rung 2). If *that* still overshoots, it falls
back to the old duration-based bitrate math with `-maxrate` / `-bufsize`
(rung 3) — guaranteed under 100 MB. The common case never pays for the
safety net; the safety net only exists so that an unusually long or busy
clip cannot break the upload.

Two visible knobs are deliberately *not* added:

- **No frame-rate cap.** Films are first-class on this site (the
  `isFilmOnly` projects). A 60fps pan stays 60fps. Frame rate is the one
  knob that visibly hurts motion, so we leave it alone.
- **Audio stays.** Videos can still be unmuted on tap in the Mosaic, so
  audio is kept (just smaller), not stripped.

The Mosaic itself is **not touched**. It already does the right thing
(`autoplay loop muted playsinline preload="metadata"`) — it was simply being
fed oversized files.

The new vocabulary — **Web-delivery encode** — is already written into
`CONTEXT.md` under *Authoring & assets*, alongside the **WebP convention**
it mirrors.

## User Stories

1. As a visitor on an Indian mobile network, I want a project's video tiles
   to begin playing as quickly as its photo tiles, so that the Mosaic does
   not stall the moment I scroll into the videos.
2. As a visitor on a slow link, I want each video to start playing **before**
   the file has finished downloading, so that the autoplay loop reads as a
   moving photo rather than a long blank rectangle.
3. As a visitor on a phone, I want the video quality to remain
   indistinguishable from what I see today, so that the speed-up is invisible
   except as speed.
4. As a visitor on a film-only project (a 60fps pan, a slow-mo, a film clip),
   I want motion to stay smooth and uncapped, so that the films do not
   degrade into a stutter to save bytes.
5. As a visitor who taps a video tile to unmute it in the Mosaic, I want
   the audio to still be there and still be usable, so that the option to
   listen is not silently removed.
6. As the Admin importing a phone clip in the typical 20–60 MB range, I want
   the Admin to optimize it for the web instead of shipping the source
   byte-for-byte, so that every video on the site is web-fast, not just the
   ones that happened to exceed an old size threshold.
7. As the Admin, I want the encoder to hit a fixed web-quality target rather
   than chase the GitHub ceiling, so that file size falls out of the clip's
   own complexity instead of being a budget to consume.
8. As the Admin, I want every video to ship at **720p**, so that no video
   on the site is paying for desktop resolution it never gets to use.
9. As the Admin, I want the compression step to finish substantially faster
   than today, so that preparing a project no longer drags on encodes
   tuned for fidelity that no visitor will ever see.
10. As the Admin, I want the progress bar to keep working through the
    encode exactly as it does today, so that the speed-up does not come at
    the cost of the existing authoring feel.
11. As the Admin, I want the rare unusually long or busy clip to still land
    under GitHub's 100 MB limit automatically, so that an upload never
    fails for size and I never have to think about ffmpeg flags by hand.
12. As the Admin, I want the safety-net escalation to be transparent —
    rung 1 (CRF 23, 720p), rung 2 (CRF 28, 720p), rung 3 (bitrate-capped) —
    so that on the rare clip that overshoots, the *why* is legible rather
    than a mystery re-encode.
13. As the Admin, I want the safety-net rungs to only fire **on overshoot**,
    so that the common case never pays for the rare case.
14. As the Admin, I want the "done" notice in the UI to describe what
    actually happened ("optimized for fast web playback at 720p"), not the
    historical "compressed to fit under 100 MB", so that the wording
    matches the new contract.
15. As a future maintainer reading `mosaic.js`, I want autoplay, loop,
    muted, `playsinline`, and `preload="metadata"` to be unchanged, so that
    a working playback surface is not collaterally damaged by an upstream
    encode change.
16. As a future maintainer, I want the **photo → WebP** pipeline, the
    **ZIP** packaging, and the **Manifest** regeneration step to be
    unchanged, so that the blast radius of this PRD is video-only.
17. As a future maintainer, I want the **Web-delivery encode** named and
    defined in `CONTEXT.md` next to the **WebP convention**, so that "why
    is no video on this site 1080p?" is answered in the glossary rather
    than inferred from ffmpeg flags. (Done inline with the plan.)
18. As a future maintainer, I want an ADR considered for *"All gallery
    videos are normalized to a 720p Web-delivery encode — load speed on
    Indian mobile is prioritized over source fidelity, and GitHub's
    100 MB limit is a safety net, not a quality target"*, so that the
    deliberate cap on resolution is documented as a decision, not read as
    an oversight.

## Implementation Decisions

### One pipeline change, one site contract

All changes live inside **the Admin**'s video pipeline. **The Mosaic**, the
**Manifest**, the photo → **WebP** path, the **ZIP** packaging, and every
other surface are untouched. The site-level contract is the one new term in
the glossary: every gallery video is a **Web-delivery encode** — a 720p
H.264 MP4 tuned for fast playback on Indian mobile.

### Always-transcode, no passthrough

The Admin no longer treats "small enough to fit GitHub" as "good enough to
ship". Every video flows through the encode. A clip already smaller than the
CRF target passes through near-untouched; the point is one predictable path,
not literal re-compression of every file.

### Quality target, not size budget (rung 1, the normal path)

The normal encode is:

- **Resolution cap:** 720p, applied as `min(1280, iw) × min(720, ih)` with
  `force_original_aspect_ratio=decrease`, so the encode never *up*scales a
  smaller source and never breaks aspect.
- **Quality:** `libx264 -crf 23` — visually transparent default,
  quality-leaning.
- **Speed:** `-preset faster` — roughly twice as fast as `medium`; the 5–10%
  size cost is noise now that 720p + CRF do the heavy lifting.
- **Streaming:** `-pix_fmt yuv420p -movflags +faststart` — playback begins
  before download completes, which matters most on slow links.
- **Audio:** `aac -b:a 96k` — inaudible drop on phone speakers, kept (not
  dropped) so the Mosaic's tap-to-unmute still has audio to unmute.

The old `FACTORS` / `totalK` / `videoK` duration-based bitrate math is
removed from the normal path. It survives only inside rung 3.

### 100 MB demoted to a 3-rung safety net

After encode, the Admin reads `blob.size`. If it exceeds the GitHub limit:

1. **Rung 1** — normal encode (CRF 23, 720p, `faster`). Virtually always
   wins.
2. **Rung 2** — re-encode at **CRF 28, 720p**, same preset. Tried only if
   rung 1 overshoots.
3. **Rung 3** — bitrate-capped pass with `-maxrate` / `-bufsize`, derived
   from the clip duration and the 95 MB target the old code already used.
   Last resort, guaranteed under 100 MB. The clip-duration helper survives
   solely because rung 3 needs it.

The common case is one encode; the safety net only fires on overshoot.

### The two constants, narrowed

- `VIDEO_HARD_BYTES` (100 MB) keeps its meaning: the GitHub limit, used
  as the safety-net trigger.
- `VIDEO_CAP_BYTES` (95 MB) is no longer a passthrough threshold. Its only
  remaining role is feeding rung 3's bitrate math. The constant stays, but
  its narrowed role is made explicit at its declaration site so a future
  reader does not mistake it for the old "ship anything below this" line.

### Progress wiring is unchanged

`ffmpeg.wasm`'s `on('progress')` callback continues to drive the Admin's
existing progress bar. The encode is faster; the wiring around it is the
same.

### Glossary and ADR

- `CONTEXT.md` already documents **Web-delivery encode** under *Authoring &
  assets*, next to the **WebP convention** it mirrors (done inline with the
  plan).
- An ADR is earned for *"All gallery videos are normalized to a 720p
  Web-delivery encode — load speed on Indian mobile is prioritized over
  source fidelity, and GitHub's 100 MB limit is a safety net, not a
  quality target"*. Offered, not yet written.

### What stays untouched

- **The Mosaic** (`mosaic.js`): `autoplay loop muted playsinline
  preload="metadata"`, the visible/audible/play-pause IntersectionObserver,
  the one-unmuted-at-a-time behaviour, the film-only stack layout.
- The photo → **WebP** pipeline.
- The **ZIP** packaging.
- The **Manifest** regeneration step.
- Single-threaded `ffmpeg.wasm` on plain static hosting (no COOP/COEP). The
  speed-up comes from the encode settings, not from threading.

## Testing Decisions

A good test for this change measures **what the visitor and the Admin
actually experience** — encode time, output size, output resolution,
playback behaviour in the Mosaic — not which ffmpeg flags were passed. A
test bound to "the command line contains `-crf 23`" would couple to a
specific knob that is expected to be tuned. The existing PRDs on this site
(`the-living-mosaic.md`, `the-reach.md`, `void-mobile-density-prd.md`)
verify against externally observable behaviour; this PRD follows the same
convention.

Verification matrix, run as a manual checklist in the Admin and in a
project's Mosaic:

1. **Typical phone clip (20–60 MB, 1080p source).** Drop it into the Admin.
   The output is **720p** (verify in any metadata reader / `ffprobe`), runs
   the autoplay loop in the Mosaic indistinguishably from the source on a
   phone, and is **single-digit MB** rather than its original size.
2. **Already-small clip (< CRF target).** Drop in a clip already smaller
   than the CRF target would produce. It still passes through `compressVideo`
   (no byte-for-byte shortcut), and the output is still 720p / well under
   100 MB. There is no "this video was skipped" code path.
3. **Long / busy clip that would overshoot 100 MB at CRF 23.** Drop in a
   clip the rung 1 encode lands above 100 MB. Rung 2 (CRF 28) fires
   automatically; if rung 2 still overshoots, rung 3 (bitrate-capped) fires
   and the final blob is under 100 MB. No upload failure for size.
4. **Films are first-class.** A 60fps film-only clip stays **60fps** end-to-
   end (verify with `ffprobe`). Motion in the Mosaic is smooth, not the
   stutter a frame-rate cap would introduce.
5. **Audio survives.** A clip with audio still has an AAC track in the
   output. In the Mosaic, tap-to-unmute produces audible, intelligible
   sound on a phone.
6. **Aspect ratio is preserved.** A vertical clip (9:16 phone clip) and a
   widescreen clip (16:9) both land at the correct aspect and never
   upscale beyond their source.
7. **`+faststart` works.** Throttle the network to Slow 3G in DevTools and
   open the project. Video tiles begin playing **before** the file has
   finished downloading — not after.
8. **Encode speed.** A clip that previously took N seconds at `medium` /
   1080p / ~100 MB output is meaningfully faster end-to-end. The Admin
   progress bar still moves smoothly through the encode.
9. **Mosaic regression.** Every video tile still autoplays, loops, is
   muted by default, plays inline (no fullscreen on iOS), and respects the
   25%-visibility play/pause observer; one-unmuted-at-a-time behaviour is
   unchanged. The visible/audible behaviour from `the-living-mosaic.md` is
   unaffected.
10. **Done-notice wording.** After upload, the Admin's success message
    describes the new contract ("optimized for fast web playback at 720p")
    rather than the historical "compressed to fit under 100 MB".
11. **Photo / ZIP / Manifest regression.** Photo → WebP, ZIP packaging, and
    Manifest regeneration are unchanged: a project containing both photos
    and videos still packages and re-indexes exactly as before.

Prior art: the verification checklists at the end of
[the-living-mosaic.md](the-living-mosaic.md), [the-reach.md](the-reach.md),
and [void-mobile-density-prd.md](../void-mobile-density-prd.md) — all
observable on the page, in the Admin, or in `ffprobe`, none coupled to
script internals.

## Out of Scope

- **The Mosaic** (`mosaic.js`) and its playback surface — untouched by
  hard contract. Autoplay/loop/muted/`playsinline`/`preload="metadata"` and
  the play/pause IntersectionObserver are correct already; this PRD only
  fixes what feeds them.
- A frame-rate cap. Considered and rejected: films are first-class, and a
  cap is the one knob that visibly hurts motion.
- Stripping audio. Considered and rejected: tap-to-unmute in the Mosaic is
  a real feature; 96 kbit AAC is small enough that keeping audio costs
  effectively nothing.
- A 1080p tier. Considered and rejected: nothing on this site ever needs
  it — the Mosaic plays muted inline tiles — and 720p is the biggest single
  lever for both file size and encode time.
- Multi-threaded `ffmpeg.wasm` (COOP/COEP). Considered and rejected: the
  v23 de-jank regression burned this path; the speed-up here comes from
  the encode settings, not from threading, and the hosting stays plain
  static.
- HLS / DASH adaptive streaming. The site is static GitHub Pages; adaptive
  streaming is not in scope and not needed for sub-10 MB tiles.
- A separate **poster** generation step. The Mosaic does not currently
  rely on posters and `preload="metadata"` is already in place; not in
  scope here.
- The **Void**, the **Listing**, the Projects index, the **Manifest**
  schema. This pass is Admin-pipeline-only.
- Re-encoding the **existing** project videos already committed to the
  repo. This PRD changes the encode going forward; back-filling old
  projects is a separate, optional pass.
- Writing the ADR. Offered above; that is a build-time decision.

## Further Notes

- The encode change is small (one function rewritten, one short-circuit
  removed, one constant's role narrowed), but the *contract* is the
  durable thing: the **Web-delivery encode** is the motion counterpart to
  the **WebP convention**. That is the part future maintainers should
  carry forward even if every flag in the encode is later retuned.
- Numbers in this PRD (CRF 23, `preset faster`, AAC 96k, 720p cap) are
  the chosen starting point, not a contract. They are expected to be
  tuned at build with real clips on a real phone on a real Indian
  mobile link. The contract is **constant-quality, 720p-capped,
  fast-start MP4 with audio kept** — the specific numbers are the knob.
- The PRD avoids file paths and line numbers; the plan file
  [plan-video-web-delivery.md](../../plan-video-web-delivery.md) carries
  the current seams in `admin.html` (`compressVideo` at line 882, the
  passthrough short-circuit at line 1424, the done-notice at line 1446)
  for the implementer to read at the moment of build.
