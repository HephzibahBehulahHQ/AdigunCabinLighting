# AdigunCabinLighting release status

**Verified date:** 2026-11-13 (Europe/Berlin)

## Latest deployed release checkpoint

- **Latest functional milestone:** [PR #36 — Fuzz firmware frame parsing](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/36), merged.
- **Merge commit:** [`1daf665f34945a5362d2f5960cedf56177010a85`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/1daf665f34945a5362d2f5960cedf56177010a85).
- **PR CI:** [App CI 43583310950](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43583310950) and [firmware CI 43583310966](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43583310966) passed. Firmware CI includes the 50,000-input Clang libFuzzer run with ASan/UBSan, ESP-IDF v6.1 ESP32-S3 compile, and portable host checks.
- **Post-merge CI:** [App CI 43585594090](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43585594090) and [firmware CI 43585594097](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43585594097) passed.
- **GitHub Pages:** [Run 43585594063](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43585594063) succeeded for the merge commit.
- **Previous gateway increment:** [PR #35](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/35) isolated authenticated and anonymous rate-limit buckets; its [PR CI](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43416406179), [post-merge CI](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43419570479), and [Pages deployment](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43419570607) passed.
- **Production smoke:** Not rerun after PR #35 or #36. The latest recorded HTTPS HEAD requests after PR #33 returned HTTP 200 for the [landing page](https://adiguncabinlighting.hephzibahbehulah.com/) and [Studio](https://adiguncabinlighting.hephzibahbehulah.com/studio/).
- **Studio boundary:** PR #35 changes gateway code, tests, and docs; PR #36 changes firmware tests, firmware CI, README, and traceability. Neither changes Studio application source, layout, styling, navigation, panels, labels, or controls.

## Current deployed scope

The static website contains the offline Studio and roadmap documentation. The separate Node service provides deterministic local scene preview, binds only to `127.0.0.1`, uses a minimum 32-byte bearer token, enforces JSON-only uncompressed preview bodies, separates authenticated and anonymous per-peer rate-limit buckets, and performs bounded signal shutdown. It explicitly reports `SIMULATION` with physical output disabled. It has no hardware adapter, telemetry source, actuator route, or aircraft connection. GitHub Pages does not host or run this Node service. Firmware CI now includes a bounded sanitizer-backed parser fuzz run; the firmware still drives no outputs, and board flashing, transport, and HIL remain NOT TESTED.

The Studio remains an offline visual simulator. The A350-900 planning profile is not an airline fit, OEM model, or certified digital twin; other cabin geometry remains illustrative. No physical output, OEM compatibility, certification, or airline approval is claimed.

## In progress

The repository now contains an unsupported OEM SDK contract and ICD worksheet, offline scene preflight and revision diff, bounded scene-file reader, token-rotation guide, and [master-plan traceability matrix](REQUIREMENTS_TRACEABILITY.md). These do not claim aircraft fit or operator approval. Physical bench testing, production gateway hosting, an advisory AI runtime, role-based operator workflows, and reviewed localization remain incomplete. See [ACTIVE_GOAL.md](ACTIVE_GOAL.md), [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md), [firmware notes](../firmware/bench-controller/README.md), and the [OEM ICD worksheet](integrations/OEM_INTERFACE_REQUIREMENTS.md).

