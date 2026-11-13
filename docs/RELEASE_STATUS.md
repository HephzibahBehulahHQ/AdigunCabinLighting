# AdigunCabinLighting release status

**Verified date:** 2026-11-13 (Europe/Berlin)

## Latest deployed release

- **PR:** [#18 — Bound local simulator gateway HTTP resources](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/18), merged.
- **Merge commit:** [`a1685a101888712ffa310f9b9a55326c6d3010c6`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/a1685a101888712ffa310f9b9a55326c6d3010c6).
- **PR CI:** [Run 43375463726](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43375463726) passed lint, type checks, unit/integration tests, production build, and Chromium browser tests.
- **Post-merge CI:** [Run 43375854021](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43375854021) succeeded.
- **GitHub Pages:** [Run 43375854073](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43375854073) succeeded for the merge commit.
- **Production smoke:** HTTPS HEAD checks returned 200 for [landing page](https://adiguncabinlighting.hephzibahbehulah.com/) and [Studio](https://adiguncabinlighting.hephzibahbehulah.com/studio/) after deployment.
- **Studio boundary:** PRs #16–#18 changed no Studio source files. This firmware increment also excludes all Studio files. The approved layout, styling, navigation, panels, labels, and controls remain locked.

## Current deployed scope

The static website contains the offline Studio and roadmap documentation. PR #16 added a separate Node service for deterministic local scene preview, bound only to `127.0.0.1`, authenticated by a minimum 32-byte bearer token, and explicitly reporting `SIMULATION` with physical output disabled. It has no hardware adapter, telemetry source, actuator route, or aircraft connection. GitHub Pages does not host or run this Node service.

The Studio remains an offline visual simulator. The A350-900 planning profile is not an airline fit, OEM model, or certified digital twin; other cabin geometry remains illustrative. No physical output, OEM compatibility, certification, or airline approval is claimed.

## In progress

PR #18's gateway resource limits are merged and deployed. The current increment adds a compile-only ESP32-S3 firmware core; it does not enable pins, physical output, or a hardware transport. Hardware testing, production gateway hosting, an advisory AI runtime, OEM SDK, operator workflows, and reviewed localization remain incomplete. See [ACTIVE_GOAL.md](ACTIVE_GOAL.md), [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md), and [firmware notes](../firmware/bench-controller/README.md).
