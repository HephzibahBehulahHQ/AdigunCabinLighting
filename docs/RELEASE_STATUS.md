# AdigunCabinLighting release status

**Verified date:** 2026-11-13 (Europe/Berlin)

## Latest deployed release

- **PR:** [#19 — Add fail-closed ESP32-S3 firmware core](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/19), merged.
- **Merge commit:** [`68b9a9e0cb0d8f79a8435d576fda07765b2617a1`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/68b9a9e0cb0d8f79a8435d576fda07765b2617a1).
- **PR CI:** app and Studio checks [43377838794](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43377838794) and firmware build/host checks [43377838769](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43377838769) passed.
- **Post-merge CI:** app checks [43378608100](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43378608100) and firmware build/host checks [43378608098](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43378608098) passed.
- **GitHub Pages:** [Run 43378608172](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43378608172) succeeded for the merge commit.
- **Production smoke:** HTTPS HEAD checks returned 200 for [landing page](https://adiguncabinlighting.hephzibahbehulah.com/) and [Studio](https://adiguncabinlighting.hephzibahbehulah.com/studio/) after deployment.
- **Studio boundary:** PR #19 changed no Studio source files. The approved layout, styling, navigation, panels, labels, and controls remain locked.

## Current deployed scope

The static website contains the offline Studio and roadmap documentation. PR #16 added a separate Node service for deterministic local scene preview, bound only to `127.0.0.1`, authenticated by a minimum 32-byte bearer token, and explicitly reporting `SIMULATION` with physical output disabled. It has no hardware adapter, telemetry source, actuator route, or aircraft connection. GitHub Pages does not host or run this Node service.

The Studio remains an offline visual simulator. The A350-900 planning profile is not an airline fit, OEM model, or certified digital twin; other cabin geometry remains illustrative. No physical output, OEM compatibility, certification, or airline approval is claimed.

## In progress

PR #19 adds a compile-only ESP32-S3 firmware core; its CRC self-check, protocol/state host checks, and target build passed CI. It does not enable pins, physical output, or a hardware transport. Hardware testing, production gateway hosting, an advisory AI runtime, OEM SDK, operator workflows, and reviewed localization remain incomplete. See [ACTIVE_GOAL.md](ACTIVE_GOAL.md), [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md), and [firmware notes](../firmware/bench-controller/README.md).
