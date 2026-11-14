# AdigunCabinLighting release status

**Verified date:** 2026-11-14 (Europe/Berlin)

## Latest deployed release checkpoint

- **Latest deployed milestone:** [PR #54 — field-level cabin and fixture evidence](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/54), merged as [`b63e6673361058b25ebfe3fd881f2f3bfe0b9318`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/b63e6673361058b25ebfe3fd881f2f3bfe0b9318).
- **PR validation:** [PR #54 CI 43623990122](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43623990122) passed. **Post-merge:** [App CI 43624522568](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43624522568) passed and [Pages run 43624522455](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43624522455) succeeded.
- **Live smoke:** On 2026-11-14, `/studio/` returned HTTP 200 and served `/assets/index-DIF_7A4g.js` (233,059 bytes). The bundle contains the mood-music, announcement/tour, and volume controls, plus the HB380 announcement text. The editor is at `/studio/`.
- **PR #45:** added offline scenario package pack/review commands, preserving cabin profile provenance and reporting missing fixture evidence. It does not expose those CLI tools as a hosted service.
- **PR #46:** applies a display-only RGBW response curve and adds Entry, Mid-cabin, Aft, and Window-row camera presets within the existing cabin viewer. **PR #47:** records the referenced Airbus planning revisions and lack of asset/reproduction permission within Change cabin details. **PR #43** aligned the illustrative RGBW white blend across 2D/3D. **PR #44** measures the existing 4K export path; 16K/24K export remains unavailable and unbenchmarked.
- **PR #49 audio:** all 16 built-in mood scenes have distinct generated instrumental arrangements synchronized to preview playback. The existing Choreography panel includes live volume, a four-note chime, an HB380 concept announcement, and browser/OS-voiced cabin tour. This is preview audio only; it is not a licensed soundtrack, approved airline wording, a cabin PA, or hardware output.
- **PR #52:** raw Host-authority regression coverage rejects malformed authorities before route handling and rate-limit accounting. **PR #53:** mood audio schedules incrementally during long previews to reduce startup work; the score remains browser-generated. **PR #54:** preflight v2 classifies manufacturer planning values, derived rows, illustrative geometry, and user edits, and includes each zone's fixture evidence with missing identity, installation coordinates, photometry, and source explicit.
- **Studio boundary:** PRs #43–#54 preserve the locked sidebar, panel positions, and overall Studio layout. Camera presets, cabin data notices, audio actions, and preflight evidence remain within existing panels or the exported report.

## Current deployed scope

The static website contains the offline Studio and roadmap documentation. The separate Node service provides deterministic local scene preview, binds only to `127.0.0.1`, uses a minimum 32-byte bearer token, enforces JSON-only uncompressed preview bodies, separates authenticated and anonymous per-peer rate-limit buckets, and performs bounded signal shutdown. It explicitly reports `SIMULATION` with physical output disabled. It has no hardware adapter, telemetry source, actuator route, or aircraft connection. GitHub Pages does not host or run this Node service. Firmware CI now includes a bounded sanitizer-backed parser fuzz run; the firmware still drives no outputs, and board flashing, transport, and HIL remain NOT TESTED.

The Studio remains an offline visual simulator. The A350-900 planning profile is not an airline fit, OEM model, or certified digital twin; other cabin geometry remains illustrative. No physical output, OEM compatibility, certification, or airline approval is claimed.

## In progress

The repository now contains an unsupported OEM SDK contract and ICD worksheet, offline scene preflight and revision diff, bounded scene-file reader, token-rotation guide, and [master-plan traceability matrix](REQUIREMENTS_TRACEABILITY.md). These do not claim aircraft fit or operator approval. Physical bench testing, production gateway hosting, an advisory AI runtime, role-based operator workflows, and reviewed localization remain incomplete. See [ACTIVE_GOAL.md](ACTIVE_GOAL.md), [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md), [firmware notes](../firmware/bench-controller/README.md), and the [OEM ICD worksheet](integrations/OEM_INTERFACE_REQUIREMENTS.md).


