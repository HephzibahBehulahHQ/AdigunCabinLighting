# AdigunCabinLighting release status

**Date:** 2026-11-13 (Europe/Berlin)  
**Status:** A source-backed A350-900 planning reference is merged and deployed. The owner-locked Cabin Studio layout is unchanged.

## Latest release

- **Pull request:** [#13 — Add source-backed Airbus A350-900 cabin reference](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/13)
- **Merge commit:** [`962c7c2717f451f245b6e77647fe8ed8d080d01c`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/962c7c2717f451f245b6e77647fe8ed8d080d01c)
- **CI:** [Run 43356510144](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43356510144) — succeeded, including Chromium end-to-end tests.
- **GitHub Pages:** [Run 43356997937](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43356997937) — succeeded for the merge commit.
- **Production:** [Landing page](https://adiguncabinlighting.hephzibahbehulah.com/) · [Studio](https://adiguncabinlighting.hephzibahbehulah.com/studio/)
- **Post-deploy smoke:** Studio page, main JS and lazy-loaded cabin JS returned HTTP 200 over HTTPS. Served assets include the A350-900 profile, 315-seat data and the “not an aircraft-specific fit” boundary.
- **Visual regression evidence:** CI artifact `cabin-lighting-ui-screenshots` is attached to [run 43356510144](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43356510144).

## Current release scope

The existing Studio keeps its docked header, left rail, cabin viewport, zone inspector, bottom transition preview and scene library. The **Change cabin** selector now includes an A350-900 standard reference using Airbus-published cabin length (51.04 m), maximum cabin width (5.71 m), 315 passenger seats (48 business / 267 economy), and class seat pitches (60 in / 32 in). Its generated 315-seat row distribution is derived from those totals and pitches, not copied from the Airbus plan drawing. The profile does not claim a specific operator fit.

The 3D cabin remains an offline generated visualization. Ceiling height, window count, bins, monuments, fixture placement and the remaining cabin geometry are generic reference values. No hardware, aircraft physical output, OEM compatibility, certification or airline authorization is provided or claimed.

## Verification

- Local: lint, typecheck, 14 unit tests, production build and `git diff --check` passed for PR #13.
- CI: PR #13 workflow run passed, including the Chromium UI tests for the new profile and required viewports.
- Production HTTP smoke verified the Studio and both JS assets after the Pages deployment.
- Local Playwright was unavailable in the sandbox because localhost sockets were denied; the CI browser suite passed.

## Locked visual baseline

The owner has directed that the Studio interface remain locked. See [APPROVED_UI_BASELINE.md](APPROVED_UI_BASELINE.md) for the approved layout, deployment and screenshot evidence. Future cabin data and simulator behavior must fit inside the existing controls without rearranging the screen.
