# Active Goal — complete the AdigunCabinLighting roadmap

**Pursuing now:** Deliver the gateway, bench firmware and hardware tests, advisory AI copilot, OEM SDK, operator workflows, localization, and safety/security evidence in small verified releases. Keep the owner-approved Studio interface locked. Do not alter its layout, styles, navigation, panels, labels, or controls. If a roadmap item cannot be delivered without changing that interface, record the dependency and defer that portion.

## Current milestone — OEM contract and operator foundations

The simulation-only gateway was merged in PR #16 and deployed as source/documentation; GitHub Pages does not host or run the Node service. The service remains local, loopback-only, and has no hardware adapter, telemetry source, actuator route, aircraft connection, or physical output. PR #17 added the initial safety/security evidence ledger and its Pages deployment succeeded.

PR #19 merged a reproducible ESP-IDF v6.1 ESP32-S3 compile target and fail-closed core. It is software-only: no serial transport, authentication, identity provisioning, GPIO/PWM, or physical output; no board was flashed. The OEM SDK now has a typed unsupported contract and an ICD worksheet, but no vendor adapter, transport, or capability claim. Operator commissioning and field workflows remain documentation-only until real authenticated bench hardware and the UI lock are addressed. The Studio stays untouched. See [firmware notes](../firmware/bench-controller/README.md) and the [OEM ICD worksheet](integrations/OEM_INTERFACE_REQUIREMENTS.md).

## Roadmap status

- **Gateway:** local deterministic simulator API with bearer authentication, finite HTTP resource bounds, and an in-memory per-peer fixed-window rate limit (120 requests/minute by default). Token lifecycle, process supervision, independent security review, and network-service deployment remain outstanding.
- **Bench firmware and hardware tests:** compile-only ESP32-S3 fail-closed protocol/state core merged; PR and post-merge builds and host checks pass. It cannot drive outputs and is not an authenticated device or commissioning firmware. No exact board/module revision, validated driver, isolated current-limited rig, physical interlock, flashed image, or HIL evidence is available.
- **Adigun BOT:** no runtime integration. Any future copilot is advisory only and must not issue hardware commands.
- **OEM SDK:** typed adapter boundary and unsupported implementation; it reports `AIRCRAFT_LOCKED`, no capabilities, and no device command. No approved aircraft configuration, OEM contract, SDK agreement, or conformance evidence is present; no vendor is supported.
- **Operator workflows:** an offline scene-file preflight command now uses the shared validator; it is schema review only. Accounts, role approvals, audit sign-off, device/bench procedures, telemetry reconciliation, and crew workflows remain unavailable.
- **Localization:** English only. German, Yoruba, and Nigerian Pidgin require reviewed translations; the Studio stays English while its interface is locked.
- **Safety/security evidence:** initial boundary, safeguards, hazards, and open gates are recorded. Qualified review, penetration testing, risk analysis, and physical test evidence remain outstanding.

## Non-negotiable limits

The app remains an offline visual simulator until each independent engineering and authorization gate is satisfied. Do not claim hardware readiness, aircraft connection, operator approval, OEM compatibility, airworthiness, certification, or verified physical behavior without evidence. Never expose aircraft actuation through the gateway. Preserve the locked Studio and deploy only after required CI and deployment checks pass.

