# AdigunCabinLighting release status

**Verified date:** 2026-11-13 (Europe/Berlin)

## Latest deployed release

- **PR:** [#17 — Record release and initial safety security evidence](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/17), merged.
- **Merge commit:** [`9c2416234126c1f23aa76ff69c7e2e631581dd43`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/9c2416234126c1f23aa76ff69c7e2e631581dd43).
- **PR CI:** [Run 43370729731](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43370729731) passed lint, type checks, unit/integration tests, production build, and Chromium browser tests.
- **GitHub Pages:** [Run 43371340579](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43371340579) succeeded for the merge commit.
- **Production smoke:** HTTPS HEAD checks returned 200 for [landing page](https://adiguncabinlighting.hephzibahbehulah.com/) and [Studio](https://adiguncabinlighting.hephzibahbehulah.com/studio/) after deployment.
- **Studio boundary:** PRs #16 and #17 changed no Studio source files. The approved layout, styling, navigation, panels, labels, and controls remain locked.

## Current deployed scope

The static website contains the offline Studio and roadmap documentation. PR #16 added a separate Node service for deterministic local scene preview, bound only to `127.0.0.1`, authenticated by a minimum 32-byte bearer token, and explicitly reporting `SIMULATION` with physical output disabled. It has no hardware adapter, telemetry source, actuator route, or aircraft connection. GitHub Pages does not host or run this Node service.

The Studio remains an offline visual simulator. The A350-900 planning profile is not an airline fit, OEM model, or certified digital twin; other cabin geometry remains illustrative. No physical output, OEM compatibility, certification, or airline approval is claimed.

## In progress

PR #18 adds finite gateway HTTP resource limits and updates the initial safety/security evidence ledger. It is not merged or deployed. Hardware testing, production gateway hosting, an advisory AI runtime, OEM SDK, operator workflows, and reviewed localization remain incomplete. See [ACTIVE_GOAL.md](ACTIVE_GOAL.md) and [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md).
