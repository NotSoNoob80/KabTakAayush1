/* ============================================================
   PROJECTS DATA MANIFEST
   ------------------------------------------------------------
   Single source of truth for both the Projects grid
   (projects.html) and the reusable project detail template
   (project.html?id=NN).

   To add or update a project:
     1. Drop a thumbnail into  assets/projects/NN/thumbnail/
        and photos into       assets/projects/NN/images/
        — name them thumbnail.webp and 01.webp, 02.webp, ...
        Videos (optional) go in assets/projects/NN/videos/
        — name them 01.mp4, 02.mp4, ... (pad-2, .mp4 only).
     2. Add or edit its entry below: title, type, meta line,
        a short description, and `imageCount` (how many photos
        are in that images/ folder). If the project has videos,
        add `videoCount` too (how many .mp4s are in videos/) —
        it's optional; absent means none (0).
        For projects with videos, the Admin also writes a `media`
        string ('i'=image, 'v'=video) that fixes the exact order
        photos and videos appear in the mosaic. Omit it and the
        videos fall back to being woven in evenly. See ADR 0005.
   That's it — both pages pick the change up automatically.
   ============================================================ */

/* @PROJECTS-START — the Admin (admin.html) regenerates everything between
   these two markers. Keep them exactly as-is; renaming or removing them
   breaks the Admin's splice. See docs/adr/0004. */
const PROJECTS = [
  {
    id: '01',
    title: 'Supreme',
    type: 'photo',
    typeLabel: 'Photo Series',
    meta: 'Photowalk · Mumbai',
    description: 'Frames from a Mumbai photowalk — chasing light, texture, and the city’s unscripted moments.',
    imageCount: 14
  },
  {
    id: '02',
    title: 'Tricking Fishes',
    type: 'photo',
    typeLabel: 'Photo Series',
    meta: 'Photowalk · India',
    description: 'A wander through reflections, water, and the quiet choreography of everyday street life.',
    imageCount: 13
  },
  {
    id: '03',
    title: 'Sassooooon',
    type: 'photo',
    typeLabel: 'Photo Series',
    meta: 'Photowalk · Sassoon Docks, Mumbai',
    description: 'Early mornings at the docks — colour, motion, and the rhythm of a working harbour.',
    imageCount: 12
  },
  {
    id: '04',
    title: 'Nawab Shit',
    type: 'photo',
    typeLabel: 'Photo Series',
    meta: 'Photowalk · Curated Series',
    description: 'A curated walk through old streets and quieter corners — frame after frame of found moments.',
    imageCount: 15
  },
  {
    id: '05',
    title: 'Nomad Shit',
    type: 'photo',
    typeLabel: 'Photo Series',
    meta: 'Photowalk · On the Move',
    description: 'Loose, in-between frames from the road — the small scenes that pass before you can plan for them.',
    imageCount: 9
  },
  {
    id: '06',
    title: 'Nandi Hills',
    type: 'photo',
    typeLabel: 'Photo Series',
    meta: 'Photowalk · Nandi Hills',
    description: 'A last good morning before the week starts again — quiet hills, soft light, and no rush to be anywhere.',
    imageCount: 8
  },
  {
    id: '07',
    title: 'Water that was still',
    type: 'film',
    typeLabel: 'Film',
    meta: 'Film · Banganga',
    description: 'A short poem.',
    imageCount: 0,
    videoCount: 9
  },
  {
    id: '08',
    title: 'Supreme 2',
    type: 'photo',
    typeLabel: 'Photo Series',
    meta: 'Photowalk · Mumbai',
    description: 'Back on the streets — Mumbai unscripted, again.',
    imageCount: 14
  },
  {
    id: '09',
    title: 'Lights and Shadows',
    type: 'photo',
    typeLabel: 'Photo Series',
    meta: 'Photowalk · Dadar',
    description: 'Dadar in contrast — where the light cuts hard and the shadows hold still.',
    imageCount: 13
  },
  {
    id: '10',
    title: 'Before Christmas',
    type: 'photo',
    typeLabel: 'Photo Series',
    meta: 'Photowalk · Bandra',
    description: 'Bandra just before the lights come down — the calm before the celebration.',
    imageCount: 10
  },
  {
    id: '11',
    title: 'Chor Bazaar',
    type: 'photo',
    typeLabel: 'Photo Series',
    meta: 'Photowalk · Mumbai',
    description: 'A wander through Mumbai\'s oldest flea market — layered, loud, and full of forgotten things.',
    imageCount: 15
  },
  {
    id: '12',
    title: 'Anatomy of a flip',
    type: 'photo',
    typeLabel: 'Photo Series',
    meta: 'Photowalk · Bangangaa',
    description: 'Anatomy of a flip',
    imageCount: 10
  }
];
/* @PROJECTS-END */

/* Helpers — build asset paths from the manifest above so every
   page constructs them the exact same way. */
function projectThumbnail(p) {
  return `assets/projects/${p.id}/thumbnail/thumbnail.webp`;
}

function projectImages(p) {
  return Array.from({ length: p.imageCount }, (_, i) =>
    `assets/projects/${p.id}/images/${String(i + 1).padStart(2, '0')}.webp`
  );
}

/* Same convention as projectImages, but for the videos/ folder —
   01.mp4, 02.mp4, ... (pad-2, .mp4 only). videoCount is optional;
   absent (or 0) yields an empty list. */
function projectVideos(p) {
  return Array.from({ length: p.videoCount || 0 }, (_, i) =>
    `assets/projects/${p.id}/videos/${String(i + 1).padStart(2, '0')}.mp4`
  );
}

/* The ordered media list the mosaic actually renders.

   If the project carries an explicit `media` order (a string of 'i'/'v'
   chars set by the Admin — 'i' = next image, 'v' = next video, in the
   exact sequence the photos and videos should appear), the mosaic follows
   it tile-for-tile. This is how drag-to-reorder placement in the Admin
   sticks. See docs/adr/0005.

   Older projects have no `media` field — for them videos are woven *evenly*
   in among the images rather than dumped at the end: a project with 12
   images and 3 videos gets a video at positions 3, 7, 11 (roughly every
   imageCount/videoCount steps), so the page never front- or back-loads all
   the video tiles. */
function projectMedia(p) {
  var images = projectImages(p);
  var videos = projectVideos(p);

  /* Explicit order wins. Walk the 'i'/'v' sequence, pulling the next image
     or video each time; append any leftovers defensively if the string and
     the counts ever disagree. */
  if (typeof p.media === 'string' && p.media.length) {
    var ordered = [];
    var ii = 0, vi = 0;
    for (var k = 0; k < p.media.length; k++) {
      if (p.media.charAt(k) === 'v' && vi < videos.length) {
        ordered.push({ kind: 'video', src: videos[vi++] });
      } else if (ii < images.length) {
        ordered.push({ kind: 'image', src: images[ii++] });
      }
    }
    while (ii < images.length) ordered.push({ kind: 'image', src: images[ii++] });
    while (vi < videos.length) ordered.push({ kind: 'video', src: videos[vi++] });
    return ordered;
  }

  if (!videos.length) {
    return images.map(function (src) { return { kind: 'image', src: src }; });
  }
  if (!images.length) {
    return videos.map(function (src) { return { kind: 'video', src: src }; });
  }
  /* Interleave: place a video every `step` image slots. */
  var result = [];
  var step   = Math.max(1, Math.round(images.length / (videos.length + 1)));
  var vi = 0; /* video index */
  var ii = 0; /* image index */
  var pos = 0;
  while (ii < images.length || vi < videos.length) {
    /* Drop a video every `step` positions, if any remain. */
    if (vi < videos.length && pos > 0 && pos % step === 0) {
      result.push({ kind: 'video', src: videos[vi++] });
    } else if (ii < images.length) {
      result.push({ kind: 'image', src: images[ii++] });
    } else {
      result.push({ kind: 'video', src: videos[vi++] });
    }
    pos++;
  }
  return result;
}

/* Look up a single project by its zero-padded string id ('01'–'99'). */
function getProjectById(id) {
  for (var i = 0; i < PROJECTS.length; i++) {
    if (PROJECTS[i].id === id) return PROJECTS[i];
  }
  return null;
}
