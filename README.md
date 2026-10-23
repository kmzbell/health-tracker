# Health Tracker

A single-file, offline-first progressive-overload workout tracker. No accounts, no server,
no analytics, no dependencies.

**Live:** https://kmzbell.github.io/health-tracker/

## What it does

- **Autoregulating progression.** Working sets stop at a target; the final set goes to
  failure, and that result sets the next session's weight and reps automatically
  (APRE-style). Reps progress before load does.
- **Built for a fixed dumbbell rack.** When the weight can't go up, a technique ladder
  (3-sec eccentrics → pauses → 1.5 reps → lengthened partials → rest-pause) takes over, and
  a "buy trigger" fires only once an exercise has genuinely outgrown the equipment.
- **~85 dumbbell exercises**, each tagged to its reference poster volume and section.
- **Protein and water logging** against a daily target, and body measurements
  (weight, waist, arms, chest, thigh).
- **Charts** — estimated-1RM trend per exercise, measurement small multiples, daily
  protein/water bars. Hand-rolled SVG; colour-vision-safe palette, validated.
- **Works with no signal.** Installable to a phone home screen.

## Privacy

**Your training data never leaves your device.** Everything lives in the browser's
`localStorage`. Nothing is transmitted anywhere — this repo is static files only.

Because storage is per-browser-per-device, **the phone and the desktop are separate
logs.** Use *Settings → Download backup* and *Restore from backup* to move data between
them. Pick one device as the real log.

## Install on a phone

1. Open the live URL in Chrome (Android) or Safari (iOS).
2. Android: menu **⋮ → Add to Home screen** (or the install prompt).
   iOS: **Share → Add to Home Screen**.
3. Launch from the icon — it runs full screen and works offline.

## Local use

Open `index.html` directly in a desktop browser. No build step.

> ⚠️ Opening `index.html` from the filesystem on **Android** is unreliable — `file://`
> pages get an opaque origin and `localStorage` may be discarded. Use the hosted URL
> on mobile.

## Updating

Edit `index.html`, commit, push. GitHub Pages redeploys in ~1 minute. The service worker
serves the cached copy first and refreshes in the background, so a change appears on the
*next* launch. To force it sooner, bump `VERSION` in `sw.js`.

## Not medical advice

Targets in this app are user-configurable numbers, not clinical guidance. The protein
default is deliberately conservative. Get your targets from a clinician.
