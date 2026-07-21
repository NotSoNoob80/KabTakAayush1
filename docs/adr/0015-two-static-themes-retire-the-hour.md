# 0015 — Two static themes replace The Hour; light is "ink & gold on paper"

- Status: Accepted
- Date: 2026-07-21

## Context

The site shipped dark-only: "cinematic black & gold" is the documented design
language ([styles.css](../../styles.css) header), and **The Hour**
([hour-tint.js](../../hour-tint.js)) graded the page background and the Void's
WebGL clear colour through a 24-hour near-black curve (cool dawn, warm dusk,
near-mono night). The Hour's hard rules were written *against a dark ground* —
"near-black with a hint", lightness swings of ~2–5 %.

The owner now wants a light mode: default to the device's
`prefers-color-scheme`, with an always-present toggle in the nav, and the Void
itself going light ("whitespace — not blinding, but total white"). Two systems
cannot both own the page background. The Hour's curve has no light
counterpart, its magnitudes are invisible to most visitors (owner's own
assessment), and every future theme decision would have to reason about a
second, clock-driven writer to the same pixels.

A second collision: `--gold #e3b23c` — the brand accent for text, hairlines,
the reticle — is ~1.9:1 against white. The dark theme's gold cannot survive
inversion unchanged.

## Decision

- **Delete The Hour entirely** — `hour-tint.js`, its four script tags, the
  `--hour-tint` fallback chain in `styles.css`, and the Void's
  `KTA.hourTint.subscribe` hook. Not kept dormant: a disabled system whose
  documented hard rules ("near-black only") contradict the live theme docs is
  a trap for every future reader. Git history is the archive.
- **Two static themes**, expressed as design tokens on `<html data-theme>`:
  - **Dark** — the existing palette, unchanged.
  - **Light** — *ink & gold on paper*: ground in the existing `--cream`
    family lifted toward white, ink text from the `--black` family, and gold
    **value-shifted, hue kept** — an ochre (~`#8a6a1f`–`#a8822c` band,
    contrast-checked per use) wherever gold must be read; the bright
    `#e3b23c` reserved for large fills.
- **Resolution order**: a stored explicit choice (`localStorage`) wins;
  otherwise the OS preference, followed *live*. First visit therefore matches
  the device. The toggle is 2-state; one tap creates the sticky override.
- **One rule survives The Hour**: the theme never grades a photographic
  pixel. Only the room changes; the work is shown true in both themes.

## Alternatives considered

- **The Hour gets a light-mode curve.** Rejected: doubles the tuning surface
  of a system the owner already reads as invisible, and keeps two writers on
  the background pixels forever.
- **Keep The Hour dormant behind a flag.** Rejected: zombie code whose
  comments assert rules the codebase no longer follows costs more in future
  reasoning than a revert-from-git would.
- **Keep gold as-is in light mode.** Rejected on arithmetic: 1.9:1 fails
  every text/UI contrast bar. Demoting gold to decoration-only would mute the
  brand exactly where the toggle invites people to look.
- **3-state toggle (light/dark/system).** Rejected: heavier chrome than this
  minimal nav wants; visitors who never touch the toggle already get "system"
  behaviour implicitly.

## Consequences

- The Void's clear colour/fog becomes a theme token consumer (it previously
  subscribed to The Hour). The light Void is a redesign surface: the
  shutter-drag **light-trail** pass (ADR 0014's bounded lighten) cannot read
  on a bright ground and runs dark-theme-only; the motion smear runs in both.
- `prefers-contrast: more` keeps its contract per theme: neutral ground, no
  atmosphere traded for legibility.
- CONTEXT.md's "The Hour" entry is retired in place (kept as a historical
  note pointing here); new entries define **the theme**, **the theme
  toggle**, and **the bulb** (the asymmetric flicker-on / snap-off switch
  transition).
- Reverting to The Hour later means re-opening this ADR and re-solving the
  two-writers problem — not just restoring the script.
