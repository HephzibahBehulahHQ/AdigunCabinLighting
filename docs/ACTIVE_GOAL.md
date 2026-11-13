# Active Goal — complete the AdigunCabinLighting roadmap

**Pursuing now:** Deliver the remaining gateway, bench firmware and hardware tests, advisory AI copilot, OEM SDK, operator workflows, localization, and safety/security evidence as small verified releases. Keep the approved Studio interface unchanged: do not alter its layout, styles, navigation, panels, or controls. Changes for these milestones belong in separate engineering layers and documentation unless a requirement cannot be met without a Studio change; in that case record the dependency and stop before changing the interface.

## Current milestone — simulation-only local gateway

The first gateway increment is a separate Node service bound to `127.0.0.1`. It requires a strong bearer token, exposes health/capability and deterministic scene-preview routes, and explicitly reports simulation mode with physical output disabled. It has no actuator route, device transport, telemetry, or connection to the Studio. The local host denies loopback sockets, so its HTTP integration tests must be run in CI before merge. Type checks, lint, and gateway compilation pass locally.

See [GATEWAY.md](GATEWAY.md) for its contract and [APPROVED_UI_BASELINE.md](APPROVED_UI_BASELINE.md) for the locked interface boundary.

## Roadmap status

- **Gateway:** simulation-only local API in progress. Authenticated hardware gateway, protocol adapters, and deployment hardening remain unbuilt.
- **Bench firmware and hardware tests:** not started; no target board, validated firmware, isolated current-limited test rig, interlock, or physical test evidence is available.
- **Adigun BOT:** advisory-only integration is not implemented. It must never have direct hardware control.
- **OEM SDK:** not implemented; no OEM contract, approved aircraft configuration, SDK interface agreement, or conformance evidence is present.
- **Operator workflows:** not implemented beyond local browser projects and scene import/export.
- **Localization:** English only. German, Yoruba, and Nigerian Pidgin are roadmap items and require reviewed translations.
- **Safety/security evidence:** baseline documents and explicit simulation boundaries exist; threat model, security verification, risk analysis, traceability, and hardware evidence remain outstanding.

## Non-negotiable limits

The app remains an offline visual simulator until each independent engineering and authorization gate is satisfied. Do not claim hardware readiness, aircraft connection, operator approval, OEM compatibility, airworthiness, certification, or verified physical behavior without evidence. Never expose aircraft actuation through this gateway. Keep all work incremental, reviewable, and tested; publish releases only after required CI and deployment checks pass.
