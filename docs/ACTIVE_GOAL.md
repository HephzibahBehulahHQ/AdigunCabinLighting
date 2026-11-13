# Active Goal — complete the AdigunCabinLighting roadmap

**Pursuing now:** Deliver the gateway, bench firmware and hardware tests, advisory AI copilot, OEM SDK, operator workflows, localization, and safety/security evidence in small verified releases. Keep the owner-approved Studio interface locked. Do not alter its layout, styles, navigation, panels, labels, or controls. If a roadmap item cannot be delivered without changing that interface, record the dependency and defer that portion.

## Current milestone — complete the independent device and operator foundations

The simulation-only gateway was merged in PR #16 and deployed as source/documentation; GitHub Pages does not host or run the Node service. The service remains local, loopback-only, and has no hardware adapter, telemetry source, actuator route, aircraft connection, or physical output. PR #17 added the initial safety/security evidence ledger and its Pages deployment succeeded.

PR #19 merged a reproducible ESP-IDF v6.1 ESP32-S3 compile target, bounded frame/CRC parser, fail-closed state core and startup CRC self-check. PR and post-merge CI plus Pages deployment passed. This is a software-only build: there is no serial transport, authentication, device identity provisioning, GPIO/PWM setup, or physical output. No board was flashed and no hardware behavior was verified. Next: deliver the OEM SDK's unsupported typed contract and operator commissioning requirements without adding UI controls. See [bench-controller firmware notes](../firmware/bench-controller/README.md).

## Roadmap status

- **Gateway:** local deterministic simulator API with bearer authentication and finite HTTP resource bounds. Rate limiting, token lifecycle, process supervision, independent security review, and network-service deployment remain outstanding.
- **Bench firmware and hardware tests:** compile-only ESP32-S3 fail-closed protocol/state core merged; PR and post-merge builds and host checks pass. It cannot drive outputs and is not an authenticated device or commissioning firmware. No exact board/module revision, validated driver, isolated current-limited rig, physical interlock, flashed image, or HIL evidence is available.
- **Adigun BOT:** no runtime integration. Any future copilot is advisory only and must not issue hardware commands.
- **OEM SDK:** not implemented; no approved aircraft configuration, OEM contract, SDK agreement, or conformance evidence is present.
- **Operator workflows:** not implemented beyond local browser projects and scene import/export.
- **Localization:** English only. German, Yoruba, and Nigerian Pidgin require reviewed translations; the Studio stays English while its interface is locked.
- **Safety/security evidence:** initial boundary, safeguards, hazards, and open gates are recorded. Qualified review, penetration testing, risk analysis, and physical test evidence remain outstanding.

## Non-negotiable limits

The app remains an offline visual simulator until each independent engineering and authorization gate is satisfied. Do not claim hardware readiness, aircraft connection, operator approval, OEM compatibility, airworthiness, certification, or verified physical behavior without evidence. Never expose aircraft actuation through the gateway. Preserve the locked Studio and deploy only after required CI and deployment checks pass.
