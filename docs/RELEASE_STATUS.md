# AdigunCabinLighting release status

**Date:** 2026-11-13 (Europe/Berlin)  
**Status:** The owner-approved Cabin Studio revision is merged and deployed to GitHub Pages. Custom-domain HTTPS is enforced.

## Latest release

- **Pull request:** [#10 — Expand cabin studio scenes and projects](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/10)
- **Merge commit:** `78ec387db6d2960a2afd0575e240b82df48382d8`
- **CI verification:** [Run 43326598647](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43326598647) — succeeded, including lint, typecheck, unit tests, build and Playwright.
- **Pages deployment:** [Run 43326598675](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43326598675) — succeeded.
- **Public domain:** <https://adiguncabinlighting.hephzibahbehulah.com/>
- **Studio:** <https://adiguncabinlighting.hephzibahbehulah.com/studio/>

## Verified release scope

The Studio gives the cabin zone map the reclaimed vertical space, keeps Transition preview and Scene library docked at the bottom, and moves working project/scene actions into the left rail. It includes 11 editable RGBW zones, 16 scene presets, local project create/open/save, scene create/duplicate/rename/delete, deterministic playback, validated JSON import/export, and 4K/1080p PNG export of the 2D zone map.

- Local checks: lint passed; typecheck passed; 8/8 unit tests passed; production build passed; 11/11 Playwright checks passed.
- Browser coverage: desktop at 1280×720, 1366×768, 1440×900 and 1920×1080; mobile 390×844; zero document overflow; WCAG 2.2 AA automated check passed.
- Production smoke on 2026-11-13: landing and Studio returned HTTP 200 over HTTPS; the Studio rendered the cabin view and new project/scene actions; at 1280×800 the document matched the viewport without overflow; no browser page errors.
- First UI release history: [PR #3](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/3), [prior deployment run](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43305646729).

## Explicit limits

The active map remains an illustrative 2D zone model, not a specific aircraft cabin fit. The 3D selector stays disabled until a licensed, airline-approved passenger cabin model and exact cabin configuration are verified and added. No aircraft, hardware, physical outputs, certification or OEM compatibility is provided or claimed. Window shade scenes affect lighting only; they do not actuate blinds.

## Owner approval gate

Request approval for this revised interface as the visual baseline before continuing broader aircraft, hardware or AI work.
