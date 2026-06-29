/* ============================================================
   KabTakAayush — The Hour (light-aware grade on negative space)

   A single piecewise 24-hour curve, driven only by `new Date()`,
   shifts the page's NEGATIVE SPACE through cool-at-dawn,
   neutral-at-noon, warm-at-dusk, near-mono-at-night. No
   geolocation, no permission prompt, no network call.

   HARD RULES (never relax without re-reading PRD-wow-factor.md
   "Phase 1 — The Hour"):

     • The grade NEVER lands on a photographic pixel — not a
       Mosaic image, not an inline thumbnail, not a Void frame.
       Only the page background and the Void scene clear colour
       (the empty depth around the frames). Photographs render on
       top of body background, and Void frames render on top of
       the scene clear colour, so the rule is "negative space
       only" by construction — but if you ever consider applying
       --hour-tint to anything photographic, stop and re-read this.
     • Brand chrome (--gold, --gold-dim, all UI accents) is FROZEN
       at every hour. The curve never touches them.
     • `prefers-contrast: more` -> grade off entirely, neutral
       background. Legibility never traded for atmosphere.
     • `prefers-reduced-motion` does NOT gate this. The Hour is not
       motion; it is a quiet hue/luminance offset.
     • No geolocation. Clock-time, not true solar time. The
       latitude/season approximation is invisible to a visitor and
       worth the permission prompt's weight saved.

   The Void's scene background / fog reads from this same curve
   via KTA.hourTint.subscribe — kept here, not duplicated into
   index.html, so both surfaces stay in lockstep on revert.
   ============================================================ */

(function () {
  'use strict';

  // Recompute every 4 minutes. Per-frame would be a waste — the curve
  // moves on the order of an hour. A long-lingering tab still crosses
  // dawn/noon/dusk/night without a reload.
  var UPDATE_INTERVAL_MS = 4 * 60 * 1000;

  // Curve anchors — (hour, hue°, saturation%, lightness%).
  //
  // Magnitudes are deliberately small. The brightest hue offset is
  // dusk's warm amber at sat 14% / lightness ~5.5% — still well inside
  // "near-black with a hint." Final numbers are the user's on-device
  // HITL pass (Issue 1.3); these are the sensible starting curve.
  //
  // 0  / 24 — night       : neutral, darkest    (#070707-ish)
  // 6      — dawn         : cool blue, slight lift
  // 12     — noon         : neutral baseline    (matches --black #0a0a0a)
  // 18     — dusk         : warm amber, slight lift
  var ANCHORS = [
    { h:  0, hue:   0, sat:  0, light: 2.8 },
    { h:  6, hue: 218, sat: 12, light: 5.0 },
    { h: 12, hue:   0, sat:  0, light: 4.0 },
    { h: 18, hue:  28, sat: 14, light: 5.2 },
    { h: 24, hue:   0, sat:  0, light: 2.8 }   // == hour 0, for wrap
  ];

  function smoothstep(t) { return t * t * (3 - 2 * t); }

  // Shortest-arc hue interpolation so the wrap from 350° -> 10° goes
  // through 0°, not the long way around through 180°.
  function lerpHue(a, b, t) {
    var d = ((b - a + 540) % 360) - 180;
    return (a + d * t + 360) % 360;
  }

  function curveAt(hour) {
    // Find the bracketing anchors.
    for (var i = 0; i < ANCHORS.length - 1; i++) {
      var a = ANCHORS[i], b = ANCHORS[i + 1];
      if (hour >= a.h && hour <= b.h) {
        var t = smoothstep((hour - a.h) / (b.h - a.h));
        return {
          hue:   lerpHue(a.hue, b.hue, t),
          sat:   a.sat   + (b.sat   - a.sat)   * t,
          light: a.light + (b.light - a.light) * t
        };
      }
    }
    return { hue: 0, sat: 0, light: 3.5 };
  }

  // HSL -> RGB (0..1 components in, 0..255 out). Standard formula.
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    if (s === 0) {
      var v = Math.round(l * 255);
      return [v, v, v];
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    function hue2rgb(t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    return [
      Math.round(hue2rgb(h + 1 / 3) * 255),
      Math.round(hue2rgb(h)         * 255),
      Math.round(hue2rgb(h - 1 / 3) * 255)
    ];
  }

  function rgbToHex(rgb) {
    function pad(n) { return n < 16 ? '0' + n.toString(16) : n.toString(16); }
    return '#' + pad(rgb[0]) + pad(rgb[1]) + pad(rgb[2]);
  }

  function rgbToInt(rgb) { return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]; }

  var prefersHighContrast = window.matchMedia
    ? window.matchMedia('(prefers-contrast: more)').matches
    : false;

  var subscribers = [];
  var current = null;

  function compute() {
    var d = new Date();
    var hour = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;

    if (prefersHighContrast) {
      // Contrast-safe override: neutral near-black, no hue, no lift.
      // Matches --black (#0a0a0a) so the page reads exactly as it does
      // with The Hour absent.
      var neutralPage = [10, 10, 10];
      var neutralVoid = [8, 8, 8];
      return {
        hour:      hour,
        pageRgb:   neutralPage,
        pageHex:   rgbToHex(neutralPage),
        voidRgb:   neutralVoid,
        voidHex:   rgbToHex(neutralVoid),
        voidInt:   rgbToInt(neutralVoid),
        contrast:  true
      };
    }

    var c = curveAt(hour);
    // Page background sits a touch lighter than the Void clear colour —
    // mirroring the existing relationship between --black (#0a0a0a) and
    // the Void's hardcoded 0x080808.
    var pageRgb = hslToRgb(c.hue, c.sat / 100, c.light / 100);
    var voidRgb = hslToRgb(c.hue, c.sat / 100, Math.max(0, c.light - 0.8) / 100);
    return {
      hour:      hour,
      pageRgb:   pageRgb,
      pageHex:   rgbToHex(pageRgb),
      voidRgb:   voidRgb,
      voidHex:   rgbToHex(voidRgb),
      voidInt:   rgbToInt(voidRgb),
      contrast:  false
    };
  }

  function apply() {
    current = compute();
    if (document.documentElement) {
      document.documentElement.style.setProperty('--hour-tint', current.pageHex);
    }
    for (var i = 0; i < subscribers.length; i++) {
      try { subscribers[i](current); } catch (_) { /* never break the page over a bad listener */ }
    }
  }

  // Public API
  window.KTA = window.KTA || {};
  window.KTA.hourTint = {
    /** Latest computed values. Recomputed on the periodic tick. */
    current: function () { return current; },

    /** Subscribe to updates. Listener is also fired immediately with
        the current values, so callers can do one-line wire-up. */
    subscribe: function (fn) {
      if (typeof fn !== 'function') return function () {};
      subscribers.push(fn);
      if (current) {
        try { fn(current); } catch (_) {}
      }
      return function unsubscribe() {
        var idx = subscribers.indexOf(fn);
        if (idx >= 0) subscribers.splice(idx, 1);
      };
    }
  };

  apply();
  setInterval(apply, UPDATE_INTERVAL_MS);

  // React to a live preference flip (devtools toggling
  // prefers-contrast) without requiring a reload.
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-contrast: more)');
    var onChange = function (e) {
      prefersHighContrast = e.matches;
      apply();
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
})();
