# First UI release status

**Date:** 2026-11-12  
**Status:** Deployed to GitHub Pages. Custom-domain HTTPS is enforced, and both production routes return HTTP 200 over HTTPS.

## Release references

- **UI implementation merge:** `3867a2f625ced1225a91d9e39cd86b317e4a7242`
- **HTTPS/status-record merge:** `6a05c23b215cf55e6df5f4ef8f1ad7304071efe5`
- **UI pull request:** [#3 — Build the offline cabin lighting Studio](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/3)
- **Latest verified Pages deployment:** [Run 43305646729](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43305646729) — succeeded for the HTTPS/status-record merge; contains the same UI implementation as the merged UI commit.
- **Latest main CI and screenshot artifact:** [Run 43305646864](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43305646864) — lint, typecheck, unit tests, build, browser tests, and screenshot artifact succeeded.
- **Production domain:** <https://adiguncabinlighting.hephzibahbehulah.com/>
- **Production Studio route:** <https://adiguncabinlighting.hephzibahbehulah.com/studio/>
- **Production screenshots:** Captured from the HTTPS domain at 1440×900 (landing), 1280×800 (Studio), and 390×844 (mobile Studio); delivered in the task outputs.

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
- Production browser smoke: landing-to-Studio navigation, a pointer selection on Window surrounds, RGB setpoint update, and keyframe commit passed; no browser console errors.
- Mobile production smoke: Studio returned HTTP 200 at 390×844 with no horizontal overflow (390 px document width); no browser console errors.

## Release gate result

The first UI release requirements are implemented and deployed. Aircraft or physical hardware integration is out of scope for this release and must not be inferred from the simulator.

## Owner approval gate

Stop implementation and ask: **“Do you approve this landing page and Studio interface as the visual baseline for AdigunCabinLighting?”**


