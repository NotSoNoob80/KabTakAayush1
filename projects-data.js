/* ============================================================
   PROJECTS DATA MANIFEST
   ------------------------------------------------------------
   Single source of truth for both the Projects grid
   (projects.html) and the reusable project detail template
   (project.html?id=NN).

   To add or update a project:
     1. Drop a thumbnail into  assets/projects/NN/thumbnail/
        and photos into       assets/projects/NN/images/
        — name them thumbnail.jpg and 01.jpg, 02.jpg, ...
        Videos (optional) go in assets/projects/NN/videos/
        — name them 01.mp4, 02.mp4, ... (pad-2, .mp4 only).
     2. Add or edit its entry below: title, type, meta line,
        a short description, and `imageCount` (how many photos
        are in that images/ folder). If the project has videos,
        add `videoCount` too (how many .mp4s are in videos/) —
        it's optional; absent means none (0).
   That's it — both pages pick the change up automatically.
   ============================================================ */

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
  }
];

/* Helpers — build asset paths from the manifest above so every
   page constructs them the exact same way. */
function projectThumbnail(p) {
  return `assets/projects/${p.id}/thumbnail/thumbnail.jpg`;
}

function projectImages(p) {
  return Array.from({ length: p.imageCount }, (_, i) =>
    `assets/projects/${p.id}/images/${String(i + 1).padStart(2, '0')}.jpg`
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

/* The ordered media list the mosaic actually renders. Videos are
   woven *evenly* in among the images rather than dumped at the end:
   for I images and V videos, drop one video in after every
   ceil(I / (V + 1)) images, with any leftover videos trailing at
   the close. A video-only project (I = 0) is simply its videos in
   order. Returns {kind:'image'|'video', src} items. */
function projectMedia(p) {
  const images = projectImages(p).map((src) => ({ kind: 'image', src }));
  const videos = projectVideos(p).map((src) => ({ kind: 'video', src }));

  if (!videos.length) return images;
  if (!images.length) return videos;

  const gap = Math.ceil(images.length / (videos.length + 1));
  const media = [];
  let v = 0;

  images.forEach((item, i) => {
    media.push(item);
    if ((i + 1) % gap === 0 && v < videos.length) {
      media.push(videos[v]);
      v += 1;
    }
  });

  // Any videos that didn't fit between images trail at the end.
  while (v < videos.length) {
    media.push(videos[v]);
    v += 1;
  }

  return media;
}

function getProjectById(id) {
  return PROJECTS.find((p) => p.id === id);
}
