# Eyeball-tune the mobile frame count and confirm fps on a real phone

> Type: HITL
> Triage: ready-for-agent
> Slice 3 of 3 (+ 1 optional)

## Parent

[void-mobile-density-prd.md](../void-mobile-density-prd.md)

## What to build

Land the final mobile frame count and prove the guardrail on real hardware.
This is the human-judgement slice: two of its three checks ("same feel as
desktop", "smooth flythrough") are inherently visual / performance calls and
need a person with a phone in hand.

Three things happen in this slice:

1. **Density tune (emulation).** In DevTools with a narrow phone viewport and
   CPU/GPU throttle, compare the Void at `MOBILE_SLOTS` = 50, 60, and 70
   side-by-side with a desktop window. Pick the value that reads as "same feel
   as desktop". 60 from the previous slice is the starting point; the final
   number stays in the 50–70 band.
2. **Duplicate-spacing check.** While tuning, watch for any pair of reused
   textures that read as obvious neighbours in space or depth. If the
   stratified-Z assumption doesn't fully hold and a pairing reads wrong, offset
   or shuffle the `sample` lookup so duplicates land further apart.
3. **Real-device fps pass.** Serve the page to a real mid-range phone and fly
   through the field. If the chosen count can't hold a smooth flythrough,
   step `MOBILE_SLOTS` down until it does. **fps wins over density.**

Mobile `TO_LOAD` must still report ~30 throughout, and the desktop path must
still be byte-for-byte unchanged. The deliverable of this slice is the final
chosen `MOBILE_SLOTS` value, with both checks documented as passed.

## Acceptance criteria

- [ ] Final `MOBILE_SLOTS` chosen by eye against desktop, in the 50–70 band.
- [ ] Density on emulation reads as "same feel as desktop" at the chosen value.
- [ ] No reused texture pair reads as an obvious neighbour in space or depth.
      If any did during tuning, the `sample` lookup was offset/shuffled to
      resolve it.
- [ ] Real mid-range phone flythrough confirmed smooth at the chosen value. If
      jank appeared at the emulation-chosen value, `MOBILE_SLOTS` was stepped
      down until smoothness held.
- [ ] Mobile `TO_LOAD` still ~30.
- [ ] Desktop path still byte-for-byte unchanged.

## Blocked by

- Slice 2: [Raise the mobile frame count to the starter value of 60](02-raise-mobile-frame-count-to-60.md)
