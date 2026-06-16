/* ════════════════════════════════════════════════════════════════════════
   reach-worker.js — MediaPipe HandLandmarker, off the main thread.

   The Reach used to run detectForVideo() synchronously inside the Void's
   render thread, so every inference call (25–40 ms on weak hardware) dropped
   render frames. This worker owns the model instead: the main thread sends a
   camera frame (an ImageBitmap, transferred zero-copy) and gets back only the
   21 hand landmarks. All derivation — palm/size/curl, calibration, the clutch
   state machine, ADR 0010/0011 re-anchoring — still happens on the main
   thread, unchanged. See plan-the-reach-performance.md (ADR 0012 at build).

   Loaded as a CLASSIC worker, not a module worker: MediaPipe's FilesetResolver
   pulls its WASM glue in via importScripts(), which module workers forbid. A
   classic worker still supports dynamic import() for the CDN bundle below, so
   we keep the lazy-load and get importScripts() back.
   ════════════════════════════════════════════════════════════════════════ */

var landmarker = null;

// The bundle and WASM stay on jsDelivr: both responses carry
// `Cross-Origin-Resource-Policy: cross-origin`, so they satisfy the page's
// COEP `require-corp` (set in vercel.json to win cross-origin isolation, hence
// the threaded WASM build). The MediaPipe model on storage.googleapis.com does
// NOT send a CORP header, so under require-corp its fetch is blocked and the
// landmarker never loads — that was the v23 regression. We self-host the model
// instead: a same-origin asset is exempt from COEP entirely. See ADR 0012.
var TASKS_VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
var WASM_ROOT    = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
var MODEL_PATH   = 'models/hand_landmarker.task';

function init(delegate) {
  // Dynamic import keeps the model code out of the worker until The Reach is
  // actually enabled. When the page is cross-origin isolated, MediaPipe picks
  // the threaded+SIMD WASM build automatically (SharedArrayBuffer present);
  // otherwise it falls back to the single-thread build. No code change here.
  return import(TASKS_VISION).then(function (vision) {
    return vision.FilesetResolver.forVisionTasks(WASM_ROOT).then(function (fileset) {
      return vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
          delegate: delegate === 'CPU' ? 'CPU' : 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1
      });
    });
  }).then(function (lm) {
    landmarker = lm;
  });
}

self.onmessage = function (e) {
  var msg = e.data;

  if (msg.type === 'init') {
    init(msg.delegate).then(function () {
      self.postMessage({ type: 'ready' });
    }).catch(function (err) {
      self.postMessage({ type: 'error', message: String((err && err.message) || err) });
    });
    return;
  }

  if (msg.type === 'frame') {
    var bmp = msg.bitmap;
    if (!landmarker) {
      if (bmp) bmp.close();
      self.postMessage({ type: 'landmarks', ts: msg.ts, landmarks: null });
      return;
    }
    var flat = null;
    var infMs = 0;
    try {
      var t0 = performance.now();
      // ImageBitmap is a valid detectForVideo input. Timestamps arrive strictly
      // increasing (the main thread only sends one frame at a time), which
      // detectForVideo requires.
      var res = landmarker.detectForVideo(bmp, msg.ts);
      infMs = performance.now() - t0;
      var hand = res && res.landmarks && res.landmarks[0];
      if (hand && hand.length) {
        // Flatten to a transferable Float32Array: [x0,y0,z0, x1,y1,z1, …].
        flat = new Float32Array(hand.length * 3);
        for (var i = 0; i < hand.length; i++) {
          flat[i * 3]     = hand[i].x;
          flat[i * 3 + 1] = hand[i].y;
          flat[i * 3 + 2] = hand[i].z;
        }
      }
    } catch (err) {
      flat = null;
    } finally {
      if (bmp) bmp.close();
    }
    self.postMessage(
      { type: 'landmarks', ts: msg.ts, inf: infMs, landmarks: flat },
      flat ? [flat.buffer] : []
    );
    return;
  }

  if (msg.type === 'dispose') {
    try { if (landmarker && landmarker.close) landmarker.close(); } catch (e2) {}
    landmarker = null;
    return;
  }
};
