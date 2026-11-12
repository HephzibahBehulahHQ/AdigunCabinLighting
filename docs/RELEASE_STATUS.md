# First UI release status

**Date:** 2026-11-12  
**Status:** Deployed to GitHub Pages; HTTPS verification is pending, so the production release gate is not fully clear.

## Release references

- **Merged commit:** `3867a2f625ced1225a91d9e39cd86b317e4a7242`
- **UI pull request:** [#3 — Build the offline cabin lighting Studio](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/3)
- **Pages deployment:** [Run 43302316019](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43302316019) — succeeded for the merged commit.
- **CI and screenshot artifact:** [Run 43302316176](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43302316176) — lint, typecheck, unit tests, build, browser tests, and screenshot artifact succeeded.
- **Production domain:** <http://adiguncabinlighting.hephzibahbehulah.com/> (HTTP currently serves the deployed site.)
- **Production Studio route:** <http://adiguncabinlighting.hephzibahbehulah.com/studio/>
- **Production screenshots:** landing at 1440×900 and Studio at 1280×800 are captured in the delivery outputs as `adiguncabinlighting-landing-production.png` and `adiguncabinlighting-studio-production.png`.

## Verified scope

- Responsive landing page and `/studio/` route load from the public custom domain.
- Offline cabin scene simulator includes six named RGBW presets, editable zones, deterministic timeline playback and keyframes, local save, undo/redo, and validated JSON import/export.
- Browser checks cover the landing-to-Studio route, scene editing, persistence, timeline, per-zone fades, import/export, responsive viewports, keyboard/pointer interactions, and WCAG 2.2 AA checks.
- No aircraft connection, physical outputs, hardware diagnostics, bot, certification, or OEM compatibility is provided or claimed.

## Verification results

- Local: lint, typecheck, 6/6 unit tests, production build, and 10/10 Playwright checks passed.
- GitHub Actions on PR: `verify` passed.
- GitHub Actions after merge: `verify` and `Deploy static site to GitHub Pages` both passed.
- Public HTTP: landing and Studio render the expected content and offline/simulation status.

## Unresolved release issue

GitHub Pages Settings reports **DNS Check in Progress** and says Enforce HTTPS is unavailable because a certificate has not yet been issued for `adiguncabinlighting.hephzibahbehulah.com`. HTTPS requests fail certificate verification; the `github.io` address redirects to the custom domain over HTTP. DNS currently resolves the custom-domain CNAME to `hephzibahbehulahhq.github.io`. Recheck after GitHub issues the certificate, enable Enforce HTTPS, and verify both routes over HTTPS before calling the release fully verified.

## Owner approval gate

After HTTPS is verified, stop implementation and ask: **“Do you approve this landing page and Studio interface as the visual baseline for AdigunCabinLighting?”**

