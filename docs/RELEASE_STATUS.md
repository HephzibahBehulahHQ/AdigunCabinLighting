# First UI release status

**Date:** 2026-11-12  
**Status:** Deployed to GitHub Pages. Custom-domain HTTPS is enforced, and both production routes return HTTP 200 over HTTPS.

## Release references

- **UI implementation merge:** `3867a2f625ced1225a91d9e39cd86b317e4a7242`
- **Current main after status-record merge:** `9cea2e3ab4c278daf808d79db533b307e844cbd4`
- **UI pull request:** [#3 — Build the offline cabin lighting Studio](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/3)
- **Latest verified Pages deployment:** [Run 43303854279](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43303854279) — succeeded for current main; contains the same UI implementation as the merged UI commit.
- **CI and screenshot artifact:** [Run 43302316176](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43302316176) — lint, typecheck, unit tests, build, browser tests, and screenshot artifact succeeded.
- **Production domain:** <https://adiguncabinlighting.hephzibahbehulah.com/>
- **Production Studio route:** <https://adiguncabinlighting.hephzibahbehulah.com/studio/>
- **Production screenshots:** Captured from the HTTPS domain at 1440×900 (landing) and 1280×800 (Studio); delivered as `adiguncabinlighting-landing-production.png` and `adiguncabinlighting-studio-production.png`.

## Verified scope

- Responsive landing page and `/studio/` route load from the public custom domain.
- Offline cabin scene simulator includes six named RGBW presets, editable zones, deterministic timeline playback and keyframes, local save, undo/redo, and validated JSON import/export.
- Browser checks cover the landing-to-Studio route, scene editing, persistence, timeline, per-zone fades, import/export, responsive viewports, keyboard/pointer interactions, and WCAG 2.2 AA checks.
- No aircraft connection, physical outputs, hardware diagnostics, bot, certification, or OEM compatibility is provided or claimed.

## Verification results

- Local: lint, typecheck, 6/6 unit tests, production build, and 10/10 Playwright checks passed.
- GitHub Actions on PR: `verify` passed.
- GitHub Actions after merge: `verify` and `Deploy static site to GitHub Pages` both passed.
- Public HTTPS: landing and Studio returned HTTP 200 and rendered the expected content and offline/simulation status; GitHub Pages shows Enforce HTTPS enabled.

## Release gate result

The first UI release requirements are implemented and deployed. Aircraft or physical hardware integration is out of scope for this release and must not be inferred from the simulator.

## Owner approval gate

Stop implementation and ask: **“Do you approve this landing page and Studio interface as the visual baseline for AdigunCabinLighting?”**


