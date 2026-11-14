# Active Goal — complete the AdigunCabinLighting roadmap

**Pursuing now:** Deliver the gateway, bench firmware and hardware tests, advisory AI copilot, OEM SDK, operator workflows, localization, and safety/security evidence in small verified releases. Keep the approved Studio layout, styling, navigation, and panel positions locked. Add explicitly requested capability only inside its existing panel; do not move, resize, or redesign the workspace.

## Current milestone — portable, traceable offline scenarios

The simulation-only gateway was merged in PR #16 and deployed as source/documentation; GitHub Pages does not host or run the Node service. The service remains local, loopback-only, and has no hardware adapter, telemetry source, actuator route, aircraft connection, or physical output. PR #17 added the initial safety/security evidence ledger and its Pages deployment succeeded.

PR #19 merged a reproducible ESP-IDF v6.1 ESP32-S3 compile target and fail-closed core. It is software-only: no serial transport, authentication, identity provisioning, GPIO/PWM, or physical output; no board was flashed. The OEM SDK remains a typed unsupported contract with an ICD worksheet and no vendor adapter. PRs #43–#48 added the visual RGBW response, 4K measurement, camera presets, aircraft planning-data provenance, offline scenario packages, and engineering preflight without shifting the locked Studio layout. PR #49 added a mood-specific browser-generated instrumental for each built-in scene, a volume control, a four-note chime, the HB380 concept welcome announcement, and a cabin guide voice inside Choreography. Speech uses the browser/OS voice; this is not an approved airline PA or aircraft integration. None of these changes adds aircraft-fit, operator, or hardware approval evidence.

## Roadmap status

- **Gateway:** local deterministic simulator API with bearer authentication, finite HTTP resource bounds, JSON-only uncompressed preview bodies, separate authenticated/anonymous per-peer fixed-window rate-limit buckets (120 requests/minute by default), and bounded SIGINT/SIGTERM shutdown. Stop-and-restart token rotation is documented. External process supervision, independent security review, and network-service deployment remain outstanding.
- **Bench firmware and hardware tests:** compile-only ESP32-S3 fail-closed protocol/state core merged; PR #36 adds a 50,000-input Clang libFuzzer run with ASan/UBSan, with PR and post-merge firmware builds and host checks passing. It cannot drive outputs and is not an authenticated device or commissioning firmware. No exact board/module revision, validated driver, isolated current-limited rig, physical interlock, flashed image, or HIL evidence is available.
- **Adigun BOT:** no runtime integration. Any future copilot is advisory only and must not issue hardware commands.
- **OEM SDK:** typed adapter boundary and unsupported implementation; it reports `AIRCRAFT_LOCKED`, no capabilities, and no device command. No approved aircraft configuration, OEM contract, SDK agreement, or conformance evidence is present; no vendor is supported.
- **Operator workflows:** offline scene preflight, revision comparison, exact-byte scene receipts, and scenario package validation use the shared scene schema and bounded file reader. Scenario packages bind cabin profile provenance, zones, and multiple scenes while keeping profile and keyframe data separate; they remain unsigned simulation artifacts, not approvals or immutable audit records. Accounts, roles, bench procedures, telemetry reconciliation, and crew workflows remain unavailable.
- **Localization:** English only. German, Yoruba, and Nigerian Pidgin require reviewed translations; the Studio stays English while its interface is locked.
- **Safety/security evidence:** boundary, safeguards, hazards, open gates, and master-plan acceptance traceability are recorded. Qualified review, penetration testing, risk analysis, and physical test evidence remain outstanding. See [requirements traceability](REQUIREMENTS_TRACEABILITY.md) for evidence quality and explicit gaps.

## Non-negotiable limits

The app remains an offline visual simulator until each independent engineering and authorization gate is satisfied. Do not claim hardware readiness, aircraft connection, operator approval, OEM compatibility, airworthiness, certification, or verified physical behavior without evidence. Never expose aircraft actuation through the gateway. Preserve the locked Studio and deploy only after required CI and deployment checks pass.



