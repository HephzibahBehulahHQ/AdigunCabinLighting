# AdigunCabinLighting release status

**Verified date:** 2026-11-14 (Europe/Berlin)

## Latest deployed release checkpoint

- **Latest deployed milestone:** [PR #44 — preflight and measure the existing 3D 4K export](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/44), merged at [`28807d3ac4298f33aa031f392b8b8af632db3b38`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/28807d3ac4298f33aa031f392b8b8af632db3b38).
- **Recent PR CI:** [PR #44 CI 43598358578](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43598358578) passed lint, typecheck, all unit tests, production build, and Playwright. [PR #43 CI 43596933390](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43596933390) passed the same workflow.
- **Post-merge CI:** [PR #44 App CI 43598980807](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43598980807) and [PR #43 App CI 43597500749](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43597500749) passed.
- **GitHub Pages:** [Run 43598980815](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43598980815) succeeded for the #44 merge commit.
- **Live smoke:** Product root returned HTTP 200. The served JavaScript bundles contained the RGBW preview curve, export timing message, WebGL renderbuffer guard, and drawing-buffer dimension check.
- **PR #43:** unified the illustrative RGBW white-channel blend in 2D/3D and documented preview limits. **PR #44:** checks actual 4K renderbuffer allocation and reports local render/encode duration plus a lower-bound memory estimate; 16K/24K capture remains unavailable.
- **Previous gateway increment:** [PR #35](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/35) isolated authenticated and anonymous rate-limit buckets; its [PR CI](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43416406179), [post-merge CI](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43419570479), and [Pages deployment](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43419570607) passed.
- **Studio boundary:** PRs #43 and #44 changed preview/export logic and tests without changing Studio layout, styling, navigation, panels, labels, or controls.

## Current deployed scope

The static website contains the offline Studio and roadmap documentation. The separate Node service provides deterministic local scene preview, binds only to `127.0.0.1`, uses a minimum 32-byte bearer token, enforces JSON-only uncompressed preview bodies, separates authenticated and anonymous per-peer rate-limit buckets, and performs bounded signal shutdown. It explicitly reports `SIMULATION` with physical output disabled. It has no hardware adapter, telemetry source, actuator route, or aircraft connection. GitHub Pages does not host or run this Node service. Firmware CI now includes a bounded sanitizer-backed parser fuzz run; the firmware still drives no outputs, and board flashing, transport, and HIL remain NOT TESTED.

The Studio remains an offline visual simulator. The A350-900 planning profile is not an airline fit, OEM model, or certified digital twin; other cabin geometry remains illustrative. No physical output, OEM compatibility, certification, or airline approval is claimed.

## In progress

The repository now contains an unsupported OEM SDK contract and ICD worksheet, offline scene preflight and revision diff, bounded scene-file reader, token-rotation guide, and [master-plan traceability matrix](REQUIREMENTS_TRACEABILITY.md). These do not claim aircraft fit or operator approval. Physical bench testing, production gateway hosting, an advisory AI runtime, role-based operator workflows, and reviewed localization remain incomplete. See [ACTIVE_GOAL.md](ACTIVE_GOAL.md), [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md), [firmware notes](../firmware/bench-controller/README.md), and the [OEM ICD worksheet](integrations/OEM_INTERFACE_REQUIREMENTS.md).


