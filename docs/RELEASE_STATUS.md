# AdigunCabinLighting release status

**Verified date:** 2026-11-13 (Europe/Berlin)

## Latest deployed release checkpoint

- **Latest functional milestone:** [PR #28 — Reject duplicate and stale firmware frames](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/28), merged.
- **Merge commit:** [`45b9cf4b26285011343656a1112864e7af3968fd`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/45b9cf4b26285011343656a1112864e7af3968fd).
- **PR CI:** [Run 43401758355](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43401758355) and firmware build [43401758492](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43401758492) passed.
- **Post-merge CI:** [Run 43402682555](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43402682555) and firmware build/portable host checks [43402682574](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43402682574) passed.
- **GitHub Pages:** [Run 43402682684](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43402682684) succeeded for the merge commit.
- **Production smoke:** Not rerun after PR #28. The prior recorded HTTPS HEAD checks returned 200 for the [landing page](https://adiguncabinlighting.hephzibahbehulah.com/) and [Studio](https://adiguncabinlighting.hephzibahbehulah.com/studio/) after PR #25.
- **Studio boundary:** PR #28 changes only firmware core/tests and traceability/docs; it changes no Studio application source, layout, styling, navigation, panels, labels, or controls. Studio remains locked.

## Current deployed scope

The static website contains the offline Studio and roadmap documentation. The separate Node service provides deterministic local scene preview, binds only to `127.0.0.1`, uses a minimum 32-byte bearer token, limits request rates and performs bounded signal shutdown. It explicitly reports `SIMULATION` with physical output disabled. It has no hardware adapter, telemetry source, actuator route, or aircraft connection. GitHub Pages does not host or run this Node service.

The Studio remains an offline visual simulator. The A350-900 planning profile is not an airline fit, OEM model, or certified digital twin; other cabin geometry remains illustrative. No physical output, OEM compatibility, certification, or airline approval is claimed.

## In progress

The repository now contains an unsupported OEM SDK contract and ICD worksheet, offline scene preflight and revision diff, bounded scene-file reader, token-rotation guide, and [master-plan traceability matrix](REQUIREMENTS_TRACEABILITY.md). These do not claim aircraft fit or operator approval. Physical bench testing, production gateway hosting, an advisory AI runtime, role-based operator workflows, and reviewed localization remain incomplete. See [ACTIVE_GOAL.md](ACTIVE_GOAL.md), [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md), [firmware notes](../firmware/bench-controller/README.md), and the [OEM ICD worksheet](integrations/OEM_INTERFACE_REQUIREMENTS.md).

