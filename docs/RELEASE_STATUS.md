# AdigunCabinLighting release status

**Verified date:** 2026-11-14 (Europe/Berlin)

## Latest deployed release checkpoint

- **Latest deployed milestone:** [PR #47 — cabin source revisions and asset rights](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/47), merged at [`25b7904f83fa12853123390f037610ec2a2b15c6`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/25b7904f83fa12853123390f037610ec2a2b15c6).
- **PR validation:** [PR #47 CI 43609559773](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43609559773) passed. **Post-merge:** [App CI 43610237745](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43610237745) passed and [Pages run 43610237791](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43610237791) succeeded.
- **Live smoke:** On 2026-11-14, `/studio/` returned HTTP 200; its served bundle contained the A330/A350 planning-document revisions and the no-licensed-mesh notice. The site root is the landing page; the editor is at `/studio/`.
- **PR #45:** added offline scenario package pack/review commands, preserving cabin profile provenance and reporting missing fixture evidence. It does not expose those CLI tools as a hosted service.
- **PR #46:** applies a display-only RGBW response curve and adds Entry, Mid-cabin, Aft, and Window-row camera presets within the existing cabin viewer. **PR #47:** records the referenced Airbus planning revisions and lack of asset/reproduction permission within Change cabin details. **PR #43** aligned the illustrative RGBW white blend across 2D/3D. **PR #44** measures the existing 4K export path; 16K/24K export remains unavailable and unbenchmarked.
- **Studio boundary:** PRs #43–#47 preserve the locked sidebar, panel positions, and overall Studio layout. Camera presets and cabin data notices remain inside existing controls.

## Current deployed scope

The static website contains the offline Studio and roadmap documentation. The separate Node service provides deterministic local scene preview, binds only to `127.0.0.1`, uses a minimum 32-byte bearer token, enforces JSON-only uncompressed preview bodies, separates authenticated and anonymous per-peer rate-limit buckets, and performs bounded signal shutdown. It explicitly reports `SIMULATION` with physical output disabled. It has no hardware adapter, telemetry source, actuator route, or aircraft connection. GitHub Pages does not host or run this Node service. Firmware CI now includes a bounded sanitizer-backed parser fuzz run; the firmware still drives no outputs, and board flashing, transport, and HIL remain NOT TESTED.

The Studio remains an offline visual simulator. The A350-900 planning profile is not an airline fit, OEM model, or certified digital twin; other cabin geometry remains illustrative. No physical output, OEM compatibility, certification, or airline approval is claimed.

## In progress

The repository now contains an unsupported OEM SDK contract and ICD worksheet, offline scene preflight and revision diff, bounded scene-file reader, token-rotation guide, and [master-plan traceability matrix](REQUIREMENTS_TRACEABILITY.md). These do not claim aircraft fit or operator approval. Physical bench testing, production gateway hosting, an advisory AI runtime, role-based operator workflows, and reviewed localization remain incomplete. See [ACTIVE_GOAL.md](ACTIVE_GOAL.md), [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md), [firmware notes](../firmware/bench-controller/README.md), and the [OEM ICD worksheet](integrations/OEM_INTERFACE_REQUIREMENTS.md).


