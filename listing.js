/* ============================================================
   ABOUT — "Roti, Kapda, Makaan… and Art" listing sequence
   ------------------------------------------------------------
   `.listing__pin` is a tall scroll-track with a sticky viewport
   inside it (`.listing__viewport`). As the visitor scrolls through
   that track, this measures how far they are across it — a single
   0 → 1 "progress" value — and scrubs four classifieds cards
   through their entrances, holds, and exits accordingly.

   Scroll-feel best practices applied:
   · SMOOTHED SCRUB — the animation reads `prog`, which eases toward
     the raw scroll progress every frame, so poses never hard-freeze
     the instant the wheel stops.
   · SNAP-TO-BEAT — stop mid-transition and after ~0.3s the page
     gently auto-scrolls itself to the nearest card hold. Any user
     input (wheel, touch, key, scrollbar) cancels it instantly.
   · REVERSIBLE STATE — every visual, including the crumbled house,
     is a pure function of progress: scroll back and it un-happens.
     (One-shot *physics* like shake/debris re-arm instead, so the
     impact replays on the next pass.)

   On top of the scrubbed timelines sits a reactive layer driven
   by a continuous rAF loop:
   · screen shake + card jolt + debris when the SOLD stamp slams
   · RGB-split text that pulses with played-transition velocity
   · a price odometer that escalates Makaan's ₹10 → ₹2.4 Cr
   · letter-staggered titles, per-card internal parallax
   · a self-drawing, slowly turning mandala under Art
   · the outro wordmark reusing the stamp-slam mechanic as a callback

   Jitter hygiene: the snap auto-scroll writes whole-integer pixel
   targets (no sub-pixel oscillation), and a scene-at-rest fast path
   skips all per-card / odometer / mandala DOM work once the scrub,
   shake, debris, and snap have all settled — only the outro trigger
   keeps ticking — so a parked scene costs essentially zero paints.
   ============================================================ */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  var pin = document.querySelector('.listing__pin');
  var viewport = pin && pin.querySelector('.listing__viewport');
  var stage = pin && pin.querySelector('.listing__stage');
  if (!pin || !viewport || !stage) return;

  var cardEls = {};
  ['roti', 'kapda', 'makaan', 'art'].forEach(function (key) {
    cardEls[key] = pin.querySelector('[data-card="' + key + '"]');
  });
  if (!cardEls.roti || !cardEls.kapda || !cardEls.makaan || !cardEls.art) return;

  var stampEl = pin.querySelector('.listing__stamp--sold');
  var houseEl = pin.querySelector('.listing__art--house');
  var houseBrokenEl = pin.querySelector('.listing__art--house-broken');
  var mandalaEl = pin.querySelector('.listing__art--mandala');
  var outroEl = document.querySelector('.listing__outro-stamp');
  var asideEl = document.querySelector('.listing__outro-stamp-aside');

  var clamp = function (v, lo, hi) { return Math.min(Math.max(v, lo), hi); };
  var lerp = function (a, b, u) { return a + (b - a) * u; };
  var smoothstep = function (u) { return u * u * (3 - 2 * u); };
  var easeSnap = function (u) { return 1 - Math.pow(1 - u, 4); };

  /* ── Timeline sampling ── */
  var sample = function (timeline, t, easeFn) {
    var ease = easeFn || smoothstep;
    var first = timeline[0];
    var last = timeline[timeline.length - 1];
    if (t <= first.at) return first;
    if (t >= last.at) return last;

    for (var i = 0; i < timeline.length - 1; i++) {
      var a = timeline[i];
      var b = timeline[i + 1];
      if (t >= a.at && t <= b.at) {
        var span = b.at - a.at;
        var u = span > 0 ? ease((t - a.at) / span) : 1;
        var out = {};
        for (var key in a) {
          if (key === 'at') continue;
          out[key] = lerp(a[key], b[key], u);
        }
        return out;
      }
    }
    return last;
  };

  var TIMELINES = {
    roti: [
      { at: 0.00, op: 0, y: 140, scale: 0.7, rot: -28 },
      { at: 0.05, op: 1, y: 0, scale: 1, rot: -14 },
      { at: 0.13, op: 1, y: 0, scale: 1, rot: -14 },
      { at: 0.18, op: 0, y: -120, scale: 0.86, rot: 18 }
    ],
    kapda: [
      { at: 0.16, op: 0, y: 140, scale: 0.7, rot: 29 },
      { at: 0.22, op: 1, y: 150, scale: 1.02, rot: 13 },
      { at: 0.30, op: 1, y: 150, scale: 1.02, rot: 13 },
      { at: 0.36, op: 0, y: -120, scale: 0.86, rot: -19 }
    ],
    makaan: [
      { at: 0.34, op: 0, y: 170, scale: 0.66, rot: -16 },
      { at: 0.43, op: 1, y: 0, scale: 1.06, rot: -6 },
      { at: 0.58, op: 1, y: 0, scale: 1.06, rot: -6 },
      { at: 0.70, op: 1, y: 0, scale: 1.02, rot: -6 },
      { at: 0.78, op: 0, y: -100, scale: 0.88, rot: 11 }
    ],
    art: [
      { at: 0.74, op: 0, y: 130, scale: 0.74, rot: 17 },
      { at: 0.85, op: 1, y: 90, scale: 1.02, rot: 7 },
      { at: 1.00, op: 1, y: 90, scale: 1.02, rot: 7 }
    ]
  };

  var STAMP_TIMELINE = [
    { at: 0.58, op: 0, scale: 1.6, rot: -16 },
    { at: 0.615, op: 1, scale: 1, rot: -11 },
    { at: 0.67, op: 1, scale: 1, rot: -11 },
    { at: 0.76, op: 0, scale: 1.04, rot: -11 }
  ];

  var STAMP_LAND = 0.615;
  var ORDER = ['roti', 'kapda', 'makaan', 'art'];
  var TILT_SIGN = { roti: -1, kapda: 1, makaan: -1, art: 1 };

  // Resting holds the snap eases toward when the visitor stalls
  // mid-transition. 0 and 1 bracket the track so the sequence can
  // always settle out of its ends.
  var BEATS = [0, 0.09, 0.26, 0.50, 0.66, 0.92, 1];
  var SNAP_DEADZONE = 0.02;    // close enough to a beat = already resting

  /* ══════════════════════════════════════════
     INIT — letter spans, parallax refs, mandala
     stroke prep, odometer ref, outro rest state
  ══════════════════════════════════════════ */
  var letterEls = {};
  ORDER.forEach(function (key) {
    var title = cardEls[key].querySelector('.listing__title');
    if (!title) { letterEls[key] = []; return; }
    var text = title.textContent;
    title.textContent = '';
    letterEls[key] = text.split('').map(function (ch) {
      var s = document.createElement('span');
      s.className = 'lt';
      s.textContent = ch;
      s._lu = -1;                       // last applied stagger value (write cache)
      title.appendChild(s);
      return s;
    });
  });

  var layerEls = {};
  ORDER.forEach(function (key) {
    var c = cardEls[key];
    layerEls[key] = {
      arts:   Array.prototype.slice.call(c.querySelectorAll('.listing__art')),
      title:  c.querySelector('.listing__title'),
      price:  c.querySelector('.listing__price'),
      status: c.querySelector('.listing__status')
    };
  });
  var REST_Y = {};
  ORDER.forEach(function (key) { REST_Y[key] = TIMELINES[key][1].y; });

  var mandalaStrokes = [];
  if (mandalaEl) {
    mandalaStrokes = Array.prototype.slice.call(mandalaEl.querySelectorAll('path, circle'));
    mandalaStrokes.forEach(function (el) {
      el.setAttribute('pathLength', '1');
      el.style.strokeDasharray = '1';
      el.style.strokeDashoffset = '1';
    });
  }

  var priceEl = cardEls.makaan.querySelector('.listing__price');
  var lastPriceText = '';
  var fmtPrice = function (v) {
    if (v < 1000) return '₹' + Math.round(v);
    if (v < 100000) return '₹' + Math.round(v).toLocaleString('en-IN');
    if (v < 10000000) return '₹' + (v / 100000).toFixed(1) + ' L';
    return '₹' + (v / 10000000).toFixed(1) + ' Cr';
  };

  if (outroEl) {
    outroEl.style.opacity = '0';
    outroEl.style.transform = 'scale(1.7) rotate(-10deg)';
    outroEl.style.willChange = 'transform, opacity';
  }
  if (asideEl) {
    asideEl.style.opacity = '0';
    asideEl.style.transition = 'opacity 0.7s ease';
  }

  /* ══════════════════════════════════════════
     REACTIVE STATE
  ══════════════════════════════════════════ */
  var prog = 0;             // smoothed progress the animation reads
  var lastProg = 0;
  var velSm = 0;
  var shakeAmp = 0;
  var joltY = 0;
  var impactArmed = true;
  var debris = [];
  var outroState = 'idle';
  var outroT = 0;
  var outroShake = 0;
  var lastTime = performance.now();
  var lastSplit = -1;

  // Rest detection — true scroll stability
  var wasAtRest = false;
  var shakeOn = false;

  /* ══════════════════════════════════════════
     SNAP-TO-BEAT — scrolling stays fully free;
     stall mid-transition and the page gently
     glides itself to the nearest story hold.
  ══════════════════════════════════════════ */
  // Scroll-stability tracking — snap only fires once the raw scroll
  // position has genuinely held still, not merely between wheel events.
  var rawPrev = 0;
  var stillMs = 0;
  var lastFrameNow = performance.now();

  var lastInputT = performance.now();
  var snapActive = false;
  var snapBeat = 0;
  var expectedY = null;     // our own scrollTo writes — anything else is the user

  var onUserInput = function () {
    lastInputT = performance.now();
    snapActive = false;
    expectedY = null;
  };
  ['wheel', 'touchstart', 'touchmove', 'keydown', 'mousedown'].forEach(function (ev) {
    window.addEventListener(ev, onUserInput, { passive: true });
  });
  window.addEventListener('scroll', function () {
    // A scroll we didn't write = the user (scrollbar drag, anchor, etc.)
    if (expectedY !== null && Math.abs(window.scrollY - expectedY) > 3) onUserInput();
  }, { passive: true });

  var spawnDebris = function () {
    for (var i = 0; i < 9; i++) {
      var el = document.createElement('div');
      el.className = 'listing__debris';
      stage.appendChild(el);
      var ang = Math.random() * Math.PI;
      var spd = 4 + Math.random() * 8;
      debris.push({
        el: el,
        x: (Math.random() - 0.5) * 120,
        y: (Math.random() - 0.5) * 50,
        vx: Math.cos(ang) * spd * (Math.random() < 0.5 ? -1 : 1),
        vy: -Math.abs(Math.sin(ang)) * spd - 3,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 24,
        life: 0
      });
    }
  };

  var applyCard = function (key, frame, extraY) {
    var el = cardEls[key];
    el.style.opacity = frame.op.toFixed(3);
    el.style.transform =
      'translate(-50%, -50%) translateY(' + (frame.y + (extraY || 0)).toFixed(1) + 'px) ' +
      'scale(' + frame.scale.toFixed(3) + ') ' +
      'rotate(' + frame.rot.toFixed(2) + 'deg)';
  };

  /* ══════════════════════════════════════════
     MAIN LOOP
  ══════════════════════════════════════════ */
  var update = function (now) {
    requestAnimationFrame(update);
    var dt = clamp((now - lastTime) / 16.667, 0.25, 3);
    lastTime = now;

    var rect = pin.getBoundingClientRect();
    var vh = window.innerHeight;
    var total = rect.height - vh;
    var raw = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;

    // ── Smoothed scrub: poses ease toward the scroll position
    //    instead of freezing the instant the wheel stops ──
    prog += (raw - prog) * Math.min(1, 0.16 * dt);
    if (Math.abs(raw - prog) < 0.0004) prog = raw;

    // ── Scroll-stability accumulator: snap may only fire once the
    //    raw scroll position has genuinely held still for a beat,
    //    not merely because the wheel stopped emitting events ──
    if (Math.abs(raw - rawPrev) < 0.00008) stillMs += (now - lastFrameNow);
    else stillMs = 0;
    rawPrev = raw;
    lastFrameNow = now;

    // ── Snap-to-beat: stall mid-transition and the page glides
    //    itself to the nearest hold; any input cancels it ──
    if (!snapActive &&
        stillMs > 260 &&
        now - lastInputT > 260 &&
        raw > 0.004 && raw < 0.996) {
      var nearest = BEATS[0];
      for (var bi = 1; bi < BEATS.length; bi++) {
        if (Math.abs(BEATS[bi] - raw) < Math.abs(nearest - raw)) nearest = BEATS[bi];
      }
      if (Math.abs(nearest - raw) > SNAP_DEADZONE) {
        snapActive = true;
        snapBeat = clamp(nearest, 0.001, 0.999);
      }
    }
    if (snapActive) {
      var pinTopAbs = window.scrollY + rect.top;
      var targetY = pinTopAbs + snapBeat * total;
      var dy = targetY - window.scrollY;
      if (Math.abs(dy) < 3) {
        // Final landing: one rounded write, then stop touching scroll
        var landY = Math.round(targetY);
        window.scrollTo(0, landY);
        expectedY = landY;
        snapActive = false;
      } else {
        var newY = Math.round(window.scrollY + dy * Math.min(1, 0.085 * dt));
        expectedY = newY;
        window.scrollTo(0, newY);
      }
    }

    pin.classList.toggle('is-active', prog > 0.015 && prog < 0.985);

    // ── Velocity (of the smoothed progress) → RGB split ──
    var vel = (prog - lastProg) / dt;
    lastProg = prog;
    velSm += (vel - velSm) * 0.12 * dt;

    var speed = Math.abs(velSm);
    var split = clamp(speed * 2600 - 0.5, 0, 7);

    // (No motion blur: animating `filter` re-rasterizes the huge
    // stage every frame — the worst scroll-jank offender here. The
    // RGB split alone carries the speed effect now.)
    if (Math.abs(split - lastSplit) > 0.25) {
      var shadow = split > 0.15
        ? split.toFixed(1) + 'px 0 rgba(255,42,84,0.8), -' + split.toFixed(1) + 'px 0 rgba(0,200,255,0.8)'
        : '';
      ORDER.forEach(function (key) {
        var L = layerEls[key];
        if (L.title) L.title.style.textShadow = shadow;
        if (L.price) L.price.style.textShadow = shadow;
      });
      lastSplit = split;
    }

    // ── Stamp impact physics: one-shot, but re-armable so the
    //    moment replays on every pass ──
    if (prog < 0.55) impactArmed = true;
    if (impactArmed && prog >= STAMP_LAND && vel >= 0) {
      impactArmed = false;
      shakeAmp = 9;
      joltY = 16;
      spawnDebris();
    }

    shakeAmp *= Math.pow(0.86, dt);
    joltY *= Math.pow(0.86, dt);
    if (shakeAmp > 0.3) {
      stage.style.transform =
        'translate(' + ((Math.random() - 0.5) * 2 * shakeAmp).toFixed(1) + 'px,' +
        ((Math.random() - 0.5) * 2 * shakeAmp).toFixed(1) + 'px)';
      shakeOn = true;
    } else if (shakeOn) {
      stage.style.transform = '';   // cleared once, never rewritten at rest
      shakeOn = false;
    }

    // ── Scene-at-rest fast path: once the scrub, physics, and snap
    //    have all settled, every pose below is already correct from
    //    the previous frame — skip the DOM work entirely. (The outro
    //    trigger at the bottom still ticks every frame.) The frame
    //    that *enters* rest does one final full write pass first. ──
    var atRest = Math.abs(raw - prog) < 0.0005 &&
                 shakeAmp < 0.3 &&
                 Math.abs(joltY) < 0.3 &&
                 debris.length === 0 &&
                 Math.abs(velSm) < 0.00005 &&
                 !snapActive;
    var skipScene = atRest && wasAtRest;
    wasAtRest = atRest;

    if (!skipScene) {

    // ── Cards ──
    ORDER.forEach(function (key, idx) {
      var frame = sample(TIMELINES[key], prog);
      var extraY = key === 'makaan' ? joltY : 0;
      applyCard(key, frame, extraY);
      cardEls[key].style.zIndex = String(idx + 1);

      // Letter-stagger entrances — each span caches its last applied
      // value; the resting clear happens exactly once, not per frame.
      var t0 = TIMELINES[key][0].at;
      var t1 = TIMELINES[key][1].at;
      var u = clamp((prog - t0) / (t1 - t0), 0, 1);
      var letters = letterEls[key];
      for (var li = 0; li < letters.length; li++) {
        var lel = letters[li];
        var lu = smoothstep(clamp((u - li * 0.07) / 0.55, 0, 1));
        if (lu >= 1) {
          if (lel._lu !== 1) {
            lel.style.transform = '';
            lel.style.opacity = '';
            lel._lu = 1;
          }
        } else if (Math.abs(lu - lel._lu) > 0.002) {
          lel._lu = lu;
          lel.style.transform =
            'translateY(' + ((1 - lu) * 0.55).toFixed(3) + 'em) ' +
            'rotate(' + ((1 - lu) * 16 * TILT_SIGN[key]).toFixed(2) + 'deg)';
          lel.style.opacity = lu.toFixed(3);
        }
      }

      // Internal parallax — skipped while the card rests; the
      // transition into stillness writes the cleared pose once.
      var delta = frame.y - REST_Y[key];
      var still = Math.abs(delta) < 0.5;
      var L = layerEls[key];
      if (!still || !L.wasStill) {
        if (L.title)  L.title.style.transform  = still ? '' : 'translateY(' + (delta * 0.18).toFixed(1) + 'px)';
        if (L.price)  L.price.style.transform  = still ? '' : 'translateY(' + (delta * 0.12).toFixed(1) + 'px)';
        if (L.status) L.status.style.transform = still ? '' : 'translateY(' + (delta * 0.06).toFixed(1) + 'px)';
        for (var ai = 0; ai < L.arts.length; ai++) {
          var artEl = L.arts[ai];
          if (artEl === mandalaEl) continue;   // handled below — it also turns with scroll
          var py = still ? 0 : delta * -0.12;
          artEl.style.transform = py ? 'translateY(' + py.toFixed(1) + 'px)' : '';
        }
      }
      L.wasStill = still;

      // Mandala: parallax + a slow scroll-driven turn — updates on
      // every non-rest frame because `prog` keeps turning it even
      // while the card itself holds still.
      if (key === 'art' && mandalaEl) {
        var mpy = still ? 0 : delta * -0.12;
        mandalaEl.style.transform =
          'translateY(' + mpy.toFixed(1) + 'px) rotate(' + (prog * 60).toFixed(1) + 'deg)';
      }
    });

    // ── Makaan price odometer ──
    if (priceEl) {
      var pu = clamp((prog - 0.34) / (0.43 - 0.34), 0, 1);
      var text = pu >= 1 ? '₹2.4 Cr' : fmtPrice(10 * Math.pow(2400000, smoothstep(pu)));
      if (text !== lastPriceText) {
        priceEl.textContent = text;
        lastPriceText = text;
      }
    }

    // ── Mandala draw-in ──
    if (mandalaStrokes.length) {
      var du = clamp((prog - 0.74) / 0.18, 0, 1);
      for (var mi = 0; mi < mandalaStrokes.length; mi++) {
        var slu = clamp((du - mi * 0.03) / 0.5, 0, 1);
        mandalaStrokes[mi].style.strokeDashoffset = (1 - smoothstep(slu)).toFixed(3);
      }
    }

    // ── Sold stamp + house crumble ──
    if (stampEl) {
      var stamp = sample(STAMP_TIMELINE, prog, easeSnap);
      stampEl.style.opacity = stamp.op.toFixed(3);
      stampEl.style.transform =
        'translate(-50%, -50%) scale(' + stamp.scale.toFixed(3) + ') ' +
        'rotate(' + stamp.rot.toFixed(2) + 'deg)';

      // Ruin is a pure function of progress — NOT of the stamp's
      // opacity (which fades out later and would rebuild the house
      // mid-joke), and NOT ratcheted (scrolling back above the slam
      // honestly un-stamps the listing, keeping the whole sequence
      // reversible like the rest of the scrub).
      if (houseEl && houseBrokenEl) {
        var ruin = easeSnap(clamp((prog - 0.58) / (STAMP_LAND - 0.58), 0, 1));
        houseEl.style.opacity = (0.3 * (1 - ruin)).toFixed(3);
        houseBrokenEl.style.opacity = (0.3 * ruin).toFixed(3);
      }
    }

    } // end of !skipScene — scene DOM work

    // ── Debris physics ──
    for (var di = debris.length - 1; di >= 0; di--) {
      var d = debris[di];
      d.life += dt * 0.022;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 0.55 * dt;
      d.rot += d.vr * dt;
      if (d.life >= 1) {
        stage.removeChild(d.el);
        debris.splice(di, 1);
      } else {
        d.el.style.opacity = (1 - d.life).toFixed(2);
        d.el.style.transform =
          'translate(' + d.x.toFixed(0) + 'px,' + d.y.toFixed(0) + 'px) rotate(' + d.rot.toFixed(0) + 'deg)';
      }
    }

    // ── Outro wordmark: stamp mechanic as a callback ──
    if (outroEl) {
      var oRect = outroEl.getBoundingClientRect();
      if (outroState === 'idle' && oRect.top < vh * 0.82 && oRect.bottom > 0) {
        outroState = 'slamming';
        outroT = 0;
      }
      if (outroState === 'done' && oRect.top > vh * 1.1) {
        outroState = 'idle';
        outroEl.style.opacity = '0';
        outroEl.style.transform = 'scale(1.7) rotate(-10deg)';
        if (asideEl) asideEl.style.opacity = '0';
      }

      if (outroState === 'slamming') {
        outroT += dt / 26;
        var ot = clamp(outroT, 0, 1);
        var oe = easeSnap(ot);
        outroEl.style.opacity = clamp(ot * 3, 0, 1).toFixed(3);
        if (ot >= 1) {
          outroState = 'done';
          outroShake = 5;
          if (asideEl) {
            setTimeout(function () { asideEl.style.opacity = '0.55'; }, 450);
          }
        }
        outroEl.style.transform =
          'scale(' + lerp(1.7, 1, oe).toFixed(3) + ') rotate(' + lerp(-10, -2, oe).toFixed(2) + 'deg)';
      } else if (outroShake > 0.15) {
        outroShake *= Math.pow(0.85, dt);
        outroEl.style.transform =
          'translate(' + ((Math.random() - 0.5) * 2 * outroShake).toFixed(1) + 'px,' +
          ((Math.random() - 0.5) * 2 * outroShake).toFixed(1) + 'px) rotate(-2deg)';
      } else if (outroState === 'done') {
        outroEl.style.transform = 'rotate(-2deg)';
      }
    }
  };

  requestAnimationFrame(update);
})();
