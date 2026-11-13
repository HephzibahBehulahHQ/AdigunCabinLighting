# AdigunCabinLighting release status

**Verified date:** 2026-11-13 (Europe/Berlin)

## Latest deployed release checkpoint

- **Latest functional milestone:** [PR #33 — Validate gateway preview request media types](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/33), merged.
- **Merge commit:** [`29dc346a7406091a7c04c70ffc292f46d6256386`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/29dc346a7406091a7c04c70ffc292f46d6256386).
- **PR CI:** [Run 43412982159](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43412982159) passed lint, typecheck, unit tests, production build, and Playwright E2E.
- **Post-merge CI:** [Run 43413616124](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43413616124) passed.
- **GitHub Pages:** [Run 43413616119](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43413616119) succeeded for the merge commit.
- **Production smoke:** HTTPS HEAD requests to the [landing page](https://adiguncabinlighting.hephzibahbehulah.com/) and [Studio](https://adiguncabinlighting.hephzibahbehulah.com/studio/) returned HTTP 200 after the merge.
- **Studio boundary:** PR #33 changes only gateway request validation, its integration test, and gateway documentation; it does not change Studio application source, layout, styling, navigation, panels, labels, or controls.

## Current deployed scope

The static website contains the offline Studio and roadmap documentation. The separate Node service provides deterministic local scene preview, binds only to `127.0.0.1`, uses a minimum 32-byte bearer token, limits request rates and performs bounded signal shutdown. It explicitly reports `SIMULATION` with physical output disabled. It has no hardware adapter, telemetry source, actuator route, or aircraft connection. GitHub Pages does not host or run this Node service.

The Studio remains an offline visual simulator. The A350-900 planning profile is not an airline fit, OEM model, or certified digital twin; other cabin geometry remains illustrative. No physical output, OEM compatibility, certification, or airline approval is claimed.

## In progress

The repository now contains an unsupported OEM SDK contract and ICD worksheet, offline scene preflight and revision diff, bounded scene-file reader, token-rotation guide, and [master-plan traceability matrix](REQUIREMENTS_TRACEABILITY.md). These do not claim aircraft fit or operator approval. Physical bench testing, production gateway hosting, an advisory AI runtime, role-based operator workflows, and reviewed localization remain incomplete. See [ACTIVE_GOAL.md](ACTIVE_GOAL.md), [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md), [firmware notes](../firmware/bench-controller/README.md), and the [OEM ICD worksheet](integrations/OEM_INTERFACE_REQUIREMENTS.md).

