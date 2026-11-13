# Active Goal — complete the AdigunCabinLighting roadmap

**Pursuing now:** Complete the gateway, bench firmware and hardware tests, advisory AI copilot, OEM SDK, operator workflows, localization, and safety/security evidence as small verified releases. Keep the owner-approved Studio interface locked. Do not alter its layout, styles, navigation, panels, labels, or controls. Any roadmap item that cannot be delivered without touching that interface must be recorded as blocked by the lock rather than implemented there.

## Current milestone — safety/security evidence ledger

PR #16 merged the first authenticated, loopback-only, simulation-preview gateway foundation. The static website and docs are deployed; GitHub Pages does **not** host or run the Node gateway. The service must be started locally and has no hardware adapter, telemetry source, actuator route, aircraft connection, or physical output. Its HTTP integration tests, existing unit tests, browser suite, lint, type checks, and builds passed in GitHub CI. Production HTTPS smoke returned 200 for `/` and `/studio/`.

The next increment documents verified safeguards, hazards, residual risks, and the evidence still required before any bench or hardware claim. See [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md) and [GATEWAY.md](GATEWAY.md).

## Roadmap status

- **Gateway:** foundational simulator API merged; local process only. A hardened service, lifecycle management, audit controls, protocol adapters, and deployment remain outstanding.
- **Bench firmware and hardware tests:** not started. No selected target board, validated firmware, isolated current-limited rig, physical interlock, or test evidence is available.
- **Adigun BOT:** no runtime integration. Any future copilot is advisory only and must not issue hardware commands.
- **OEM SDK:** not implemented; no approved aircraft configuration, OEM contract, SDK agreement, or conformance evidence is present.
- **Operator workflows:** not implemented beyond local browser projects and scene import/export.
- **Localization:** English only. German, Yoruba, and Nigerian Pidgin require reviewed translations and would change Studio labels, so the locked Studio remains English until that constraint is resolved.
- **Safety/security evidence:** initial safeguards and boundaries are documented; independent safety review, threat-model review, penetration testing, hardware risk analysis, and traceable test evidence remain outstanding.

## Non-negotiable limits

The app remains an offline visual simulator until each independent engineering and authorization gate is satisfied. Do not claim hardware readiness, aircraft connection, operator approval, OEM compatibility, airworthiness, certification, or verified physical behavior without evidence. Never expose aircraft actuation through the gateway. Keep every release reviewable, preserve the locked Studio, and deploy only after required CI and deployment checks pass.
