/* ============================================================
   KabTakAayush — The theme (two static themes, never a third)

   The site renders in one of exactly two themes: dark (the original
   cinematic black & gold) and light ("ink & gold on paper"). See
   ADR 0015 — this module replaced The Hour, which owned the page's
   negative space before it.

   HARD RULES (do not relax without re-reading PRD-light-mode.md):

     • The theme grades ONLY the room around the work — never a
       photographic pixel. Mosaic images, inline thumbnails, Void
       frames and the Cover render identically in both themes. This
       is The Hour's one surviving rule, inherited whole.
     • This module is the SINGLE WRITER of `data-theme` after first
       paint. The inline <head> resolver stamps it before the
       stylesheet paints; nothing else touches it, ever.
     • A visitor who has never toggled follows the OS *live*. One tap
       of the toggle is an explicit choice: it persists and wins
       forever after on that device, including over later OS changes.
     • `localStorage` may throw (private mode, strict settings). Every
       access is wrapped — a storage failure degrades to "follow the
       OS", it never breaks the page or the control.

   The public API deliberately mirrors the retired `KTA.hourTint`:
   same `current()` / `subscribe()` shape, subscribe fires immediately
   on registration and returns an unsubscribe, and a throwing listener
   never breaks the page. The Void's wiring is a one-line swap because
   of it — the seam was already the right shape.
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'kta-theme';
  var ATTR = 'data-theme';
  var DARK = 'dark';
  var LIGHT = 'light';

  var root = document.documentElement;

  function isTheme(v) { return v === DARK || v === LIGHT; }

  // --- storage (any value that isn't one of the two themes is "absent") ---

  function readStored() {
    try {
      var v = window.localStorage.getItem(STORAGE_KEY);
      return isTheme(v) ? v : null;
    } catch (_) {
      return null;
    }
  }

  function writeStored(theme) {
    try { window.localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
  }

  // --- OS preference ---

  var lightMq = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;

  function osTheme() { return lightMq && lightMq.matches ? LIGHT : DARK; }

  // --- resolution: stored explicit choice -> OS preference -> dark ---
  //
  // The inline resolver in each <head> already ran this before first paint,
  // so in the normal case we are only reading back what it decided. Re-deriving
  // (rather than trusting blindly) keeps this module correct if the attribute
  // was never stamped — e.g. a page that forgot the resolver.

  var current = root.getAttribute(ATTR);
  if (!isTheme(current)) {
    current = readStored() || osTheme();
    root.setAttribute(ATTR, current);
  }

  var subscribers = [];

  function notify(detail) {
    for (var i = 0; i < subscribers.length; i++) {
      try { subscribers[i](detail); } catch (_) { /* never break the page over a bad listener */ }
    }
  }

  // --- <meta name="theme-color"> ---------------------------------------
  //
  // Each page ships both media-attributed variants so the browser chrome is
  // right at first paint with no script. Once the visitor overrides the OS,
  // those media queries are answering the wrong question, so every variant is
  // rewritten to the ACTIVE theme's ground: whichever one the browser picks,
  // it now reports the same colour.
  //
  // The value is read from the live `--bg` token rather than hardcoded here,
  // so the palette has exactly one source of truth (styles.css).

  function syncThemeColor() {
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    if (!metas.length) return;
    var bg = '';
    try {
      bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    } catch (_) {}
    if (!bg) return;
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', bg);
  }

  // --- the theme toggle -------------------------------------------------
  //
  // The control is a sun/moon glyph. WHICH glyph is visible is decided in CSS
  // off `html[data-theme]`, not here — so it is painted correctly by the same
  // pass that paints the theme, never flashes the wrong icon before this file
  // runs, and stays right on a page where JS never loads.
  //
  // What this function owns is the ACCESSIBLE NAME, which an icon-only button
  // has no other source for. It names the action rather than the state
  // ("Switch to light theme"), because a control's name has to say what
  // pressing it does. It is rewritten on EVERY theme change, including one
  // this button did not cause — a live OS flip — so the control is never a
  // stale promise to a screen reader.
  //
  // Note it sets attributes only and never touches the button's children:
  // writing textContent here would delete the two inline SVGs.

  function syncToggles() {
    var buttons = document.querySelectorAll('.nav__theme');
    var destination = current === DARK ? LIGHT : DARK;
    var name = 'Switch to ' + destination + ' theme';
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-label', name);
      buttons[i].setAttribute('title', name);
    }
  }

  function wireToggles() {
    var buttons = document.querySelectorAll('.nav__theme');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('data-theme-wired') === '1') continue;
      buttons[i].setAttribute('data-theme-wired', '1');
      buttons[i].addEventListener('click', function () {
        set(current === DARK ? LIGHT : DARK, { source: 'user' });
      });
    }
    syncToggles();
  }

  // --- the bulb ---------------------------------------------------------
  //
  // Dark->light flickers on like a tungsten filament warming up; light->dark
  // snaps off with nothing at all. The asymmetry is the whole point.
  //
  // PHOTOSENSITIVITY IS A HARD CONSTRAINT, NOT A TUNING PARAMETER.
  // Everything else about this effect — pulse count, spacing, warmth, total
  // duration — is tunable by eye. These three properties are not:
  //
  //   1. It is a soft OPACITY curve on a single overlay. Never a background
  //      alternation, never hard black/white. That is why the effect is built
  //      this way rather than by swapping colours.
  //   2. Every ramp between dips is >= ~110ms. A luminance change spread over
  //      that long is not perceived as a flash; instantaneous steps would be.
  //   3. There are two up-down luminance pairs across ~760ms, i.e. under
  //      three per second, which is the WCAG 2.3.1 general flash threshold.
  //
  // Whether it *feels* like a tungsten warm-up on a real display — and
  // whether three dips is the right number — is an eyeball item and is
  // flagged for the owner's on-device pass. No claim is made here.

  var BULB_MS = 760;
  var bulbEl = null;
  var bulbAnim = null;
  var bulbTimer = 0;

  var reducedMotionMq = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function prefersReducedMotion() {
    return !!(reducedMotionMq && reducedMotionMq.matches);
  }

  function clearBulb() {
    if (bulbTimer) {
      clearTimeout(bulbTimer);
      bulbTimer = 0;
    }
    if (bulbAnim) {
      try { bulbAnim.cancel(); } catch (_) {}
      bulbAnim = null;
    }
    if (bulbEl && bulbEl.parentNode) bulbEl.parentNode.removeChild(bulbEl);
    bulbEl = null;
  }

  function playBulb(outgoingGround) {
    // Tearing down any in-flight run first is what makes a double-tap resolve
    // cleanly: the second tap cancels the first curve and either starts its
    // own or (if it landed on dark) leaves nothing behind. There is no state
    // in which a stuck overlay can survive a tap.
    clearBulb();

    if (prefersReducedMotion()) return;
    if (!document.body || !document.body.animate) return;

    bulbEl = document.createElement('div');
    bulbEl.className = 'theme-bulb';
    bulbEl.setAttribute('aria-hidden', 'true');
    bulbEl.style.backgroundColor = outgoingGround;
    document.body.appendChild(bulbEl);

    // Uneven spacing and linear easing between dips: a filament stutters, it
    // does not glide. An eased curve here reads as a dissolve, which is
    // exactly the wrong instrument.
    bulbAnim = bulbEl.animate([
      { offset: 0.00, opacity: 1,    backgroundColor: '#1a1206' },  // warm-up
      { offset: 0.14, opacity: 1,    backgroundColor: '#12100c' },
      { offset: 0.30, opacity: 0.52, backgroundColor: outgoingGround },
      { offset: 0.46, opacity: 0.80 },
      { offset: 0.66, opacity: 0.28 },
      { offset: 0.82, opacity: 0.46 },
      { offset: 1.00, opacity: 0    }
    ], { duration: BULB_MS, easing: 'linear', fill: 'forwards' });

    bulbAnim.onfinish = clearBulb;

    // Belt to the onfinish suspenders. A document timeline does not advance
    // while the tab is hidden, so a visitor who switches to light and
    // immediately backgrounds the tab would leave a full-opacity overlay
    // parked over the page with no finish event coming. setTimeout is
    // throttled in that state but still fires, so the overlay is always
    // reclaimed. There is no path that ends with a stuck overlay.
    bulbTimer = setTimeout(clearBulb, BULB_MS + 240);
  }

  // --- the switch -------------------------------------------------------

  function set(theme, opts) {
    if (!isTheme(theme)) return;
    var source = (opts && opts.source) || 'api';

    // An explicit choice sticks even when it does not change anything —
    // toggling to the theme the OS already prefers is still an override, and
    // must stop the live-follow from moving the site later.
    if (source === 'user') writeStored(theme);

    if (theme === current) {
      syncToggles();
      return;
    }

    var previous = current;
    current = theme;

    var detail = { theme: theme, previous: previous, source: source };

    // Read the OUTGOING ground before the attribute flips — the bulb's
    // overlay is filled with the room the visitor is leaving, which is what
    // makes it a light coming on rather than a curtain being drawn.
    var outgoingGround = '';
    try {
      outgoingGround = getComputedStyle(root).getPropertyValue('--bg').trim();
    } catch (_) {}

    // The attribute swap is what actually repaints the page: every consumer
    // is a semantic token underneath `html[data-theme]`. Subscribers (the
    // Void's clear colour and fog) are notified in the same task, so the
    // canvas and the chrome change as ONE event and never disagree — and the
    // overlay above covers that seam while it happens.
    root.setAttribute(ATTR, theme);
    syncThemeColor();
    syncToggles();
    notify(detail);

    if (theme === LIGHT) {
      // Flickers on.
      playBulb(outgoingGround || '#0a0a0a');
    } else {
      // Snaps off. Deliberately nothing: a light switch going down is
      // instant, and any veil on the way to dark would read as a bug — or,
      // worse, as one more flash. Any in-flight flicker is torn down so a
      // fast light->dark->light never leaves a stuck overlay.
      clearBulb();
    }
  }

  // --- live OS following ------------------------------------------------
  //
  // Applies ONLY while no stored override exists. Once the visitor has
  // chosen, this listener is a no-op for the life of the device — an
  // automatic decision must never overrule an explicit one.

  function followOsIfUntouched() {
    if (readStored()) return;
    set(osTheme(), { source: 'os' });
  }

  if (lightMq) {
    if (lightMq.addEventListener) lightMq.addEventListener('change', followOsIfUntouched);
    else if (lightMq.addListener) lightMq.addListener(followOsIfUntouched);
  }

  // Re-resolve when the tab comes back to the foreground, and on bfcache
  // restore. The `change` event above is the fast path and normally does the
  // work; this is the catch-up for the cases where it never arrives — a
  // scheduled OS switch that fires while the tab is buried, a bfcache restore
  // that reinstates a page from before the flip, or an engine that updates the
  // media query's value without dispatching. Same guard, so an explicit choice
  // is still never overruled.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) followOsIfUntouched();
  });
  window.addEventListener('pageshow', followOsIfUntouched);

  // --- public API (mirrors KTA.hourTint) --------------------------------

  window.KTA = window.KTA || {};
  window.KTA.theme = {
    DARK: DARK,
    LIGHT: LIGHT,

    /** The active theme: 'dark' | 'light'. */
    current: function () { return current; },

    /** True when the visitor has made an explicit choice on this device. */
    isExplicit: function () { return !!readStored(); },

    /**
     * Switch themes.
     * @param {'dark'|'light'} theme
     * @param {{source?: 'user'|'os'|'api'}} [opts] — where the change came
     *   from. 'user' persists the choice (and, once the bulb lands, is the
     *   only source that plays it); 'os' never persists.
     */
    set: set,

    /** Toggle to the other theme as an explicit user choice. */
    toggle: function () { set(current === DARK ? LIGHT : DARK, { source: 'user' }); },

    /**
     * Subscribe to theme changes. The listener is fired immediately with the
     * current theme so callers can wire up in one line, exactly as
     * KTA.hourTint.subscribe did. Returns an unsubscribe function.
     */
    subscribe: function (fn) {
      if (typeof fn !== 'function') return function () {};
      subscribers.push(fn);
      try {
        fn({ theme: current, previous: null, source: 'init' });
      } catch (_) {}
      return function unsubscribe() {
        var idx = subscribers.indexOf(fn);
        if (idx >= 0) subscribers.splice(idx, 1);
      };
    }
  };

  // --- boot -------------------------------------------------------------

  syncThemeColor();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireToggles);
  } else {
    wireToggles();
  }
})();
