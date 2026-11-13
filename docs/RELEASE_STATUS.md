# AdigunCabinLighting release status

**Verified date:** 2026-11-13 (Europe/Berlin)

## Latest deployed release checkpoint

- **Latest application/gateway release:** [PR #25 — Document local gateway token rotation](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/25), merged.
- **Merge commit:** [`f0b4fc88b628df4d4763cde33f110d4d9f58f5e5`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/f0b4fc88b628df4d4763cde33f110d4d9f58f5e5).
- **PR CI:** [Run 43393525144](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43393525144) passed.
- **Post-merge CI:** [Run 43394197305](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43394197305) passed.
- **GitHub Pages:** [Run 43394197387](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43394197387) succeeded.
- **Production smoke:** HTTPS HEAD returned 200 for the [landing page](https://adiguncabinlighting.hephzibahbehulah.com/) and [Studio](https://adiguncabinlighting.hephzibahbehulah.com/studio/) after deployment.
- **Studio boundary:** PRs #23–#25 changed no Studio application source. PR #23 adjusted only existing E2E waits alongside gateway/docs changes; the approved layout, styling, navigation, panels, labels, and controls remain locked.

## Current deployed scope

The static website contains the offline Studio and roadmap documentation. The separate Node service provides deterministic local scene preview, binds only to `127.0.0.1`, uses a minimum 32-byte bearer token, limits request rates and performs bounded signal shutdown. It explicitly reports `SIMULATION` with physical output disabled. It has no hardware adapter, telemetry source, actuator route, or aircraft connection. GitHub Pages does not host or run this Node service.

The Studio remains an offline visual simulator. The A350-900 planning profile is not an airline fit, OEM model, or certified digital twin; other cabin geometry remains illustrative. No physical output, OEM compatibility, certification, or airline approval is claimed.

## In progress

The repository now contains an unsupported OEM SDK contract and ICD worksheet, offline scene preflight and revision diff, bounded scene-file reader, token-rotation guide, and [master-plan traceability matrix](REQUIREMENTS_TRACEABILITY.md). These do not claim aircraft fit or operator approval. Physical bench testing, production gateway hosting, an advisory AI runtime, role-based operator workflows, and reviewed localization remain incomplete. See [ACTIVE_GOAL.md](ACTIVE_GOAL.md), [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md), [firmware notes](../firmware/bench-controller/README.md), and the [OEM ICD worksheet](integrations/OEM_INTERFACE_REQUIREMENTS.md).

