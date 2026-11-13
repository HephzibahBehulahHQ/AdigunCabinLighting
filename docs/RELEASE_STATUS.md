# AdigunCabinLighting release status

**Verified date:** 2026-11-13 (Europe/Berlin)

## Latest deployed release checkpoint

- **Latest functional milestone:** [PR #30 — Add scene integrity receipts](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/30), merged.
- **Merge commit:** [`a65926e4324d5e840898ba450352c34c4a90357f`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/a65926e4324d5e840898ba450352c34c4a90357f).
- **PR CI:** [Run 43407100377](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43407100377) passed, including lint, typecheck, unit tests, production build, and Playwright E2E.
- **Post-merge CI:** [Run 43407645973](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43407645973) exposed one existing manual-setpoint E2E timing failure. [PR #31](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/31) adjusted only that test to align the fade duration with its assertion window. Its PR CI [43408816304](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43408816304) and post-merge CI [43409596794](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43409596794) passed.
- **GitHub Pages:** [Run 43407646172](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43407646172) and post-PR #31 [Run 43409596667](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43409596667) succeeded.
- **Production smoke:** Not rerun after PR #30 or #31. The prior recorded HTTPS HEAD checks returned 200 for the [landing page](https://adiguncabinlighting.hephzibahbehulah.com/) and [Studio](https://adiguncabinlighting.hephzibahbehulah.com/studio/) after PR #25.
- **Studio boundary:** PR #30 adds operator CLI/docs/tests only; PR #31 changes one Playwright assertion sequence. Neither changes Studio application source, layout, styling, navigation, panels, labels, or controls.


## Current deployed scope

The static website contains the offline Studio and roadmap documentation. The separate Node service provides deterministic local scene preview, binds only to `127.0.0.1`, uses a minimum 32-byte bearer token, limits request rates and performs bounded signal shutdown. It explicitly reports `SIMULATION` with physical output disabled. It has no hardware adapter, telemetry source, actuator route, or aircraft connection. GitHub Pages does not host or run this Node service.

The Studio remains an offline visual simulator. The A350-900 planning profile is not an airline fit, OEM model, or certified digital twin; other cabin geometry remains illustrative. No physical output, OEM compatibility, certification, or airline approval is claimed.

## In progress

The repository now contains an unsupported OEM SDK contract and ICD worksheet, offline scene preflight and revision diff, bounded scene-file reader, token-rotation guide, and [master-plan traceability matrix](REQUIREMENTS_TRACEABILITY.md). These do not claim aircraft fit or operator approval. Physical bench testing, production gateway hosting, an advisory AI runtime, role-based operator workflows, and reviewed localization remain incomplete. See [ACTIVE_GOAL.md](ACTIVE_GOAL.md), [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md), [firmware notes](../firmware/bench-controller/README.md), and the [OEM ICD worksheet](integrations/OEM_INTERFACE_REQUIREMENTS.md).

