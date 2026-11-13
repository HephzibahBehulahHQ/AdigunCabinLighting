# Initial safety and security evidence ledger

**Revision:** 0.4 · **Date:** 2026-11-13 · **Scope:** PR #18 gateway limits and PR #19 compile-only ESP32-S3 firmware core
**Status:** Engineering evidence in progress. This ledger is not a safety case, certification package, aircraft approval, penetration-test report, or substitute for review by qualified aviation safety and security specialists.

## 1. System boundary and intended use

The deployed web app is a browser-based, offline lighting-scene editor and visual simulator. A separate optional Node process can preview a validated scene locally. The gateway binds to `127.0.0.1`, authenticates each route with a bearer token, accepts only loopback `Host` values, and returns deterministic simulation results. The gateway has no device transport, telemetry input, actuator route, physical output, or aircraft connection. GitHub Pages hosts the static app and documentation only; it does not run the gateway.

**Intended use:** author, save, import/export, and visually review illustrative cabin RGBW scene timelines. The scene engine is not an irradiance calculation, fixture specification, hardware interface, or operational cabin control system.

**Out of scope:** operational airline use, aircraft integration, dispatch decisions, physical lighting control, flight-critical functions, passenger-safety functions, bench operation, aircraft-specific conformity, OEM compatibility, and airworthiness or certification claims.

## 2. Assets, trust boundaries, and assumptions

| ID | Asset or boundary | Current treatment |
| --- | --- | --- |
| A-01 | Scene definitions and locally stored drafts | Scene files are versioned and validated; drafts stay in the browser profile unless exported. |
| A-02 | Gateway bearer token | Supplied by the local process environment; the service does not log it. The operator must generate and protect it. |
| B-01 | Browser to static website | HTTPS is enforced for the public domain; the static app has no gateway connection. |
| B-02 | Local client to gateway | Plain HTTP on loopback only; bearer authentication and loopback `Host` check are enforced. |
| B-03 | Gateway to physical equipment | No such connection or route exists in this release. |

Assumptions: the local machine and Node runtime are controlled by the operator; the token is generated using a cryptographically secure random source; the process is not exposed through a reverse proxy or port forward; no safety credit is assigned to these assumptions.

## 3. Implemented controls and verification evidence

| Control | Implemented behavior | Evidence and status |
| --- | --- | --- |
| C-01 No physical command path | Only health, capability, and scene-preview routes exist; output is explicitly false. | Gateway route inspection; tests passed in CI run [43368044191](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43368044191). |
| C-02 Local bind | Listener binds to IPv4 loopback `127.0.0.1`; no configurable non-loopback address. | `gateway/server.ts`; gateway tests passed in CI. |
| C-03 Request authentication | Minimum 32 UTF-8 byte token; bearer comparison uses constant-time comparison when lengths match. | `gateway/server.ts`; strong-token/auth tests passed in CI. |
| C-04 Host validation | Requests with missing or non-loopback `Host` values are rejected. | `gateway/server.ts`; behavior reviewed in code. The test suite does not constitute a complete DNS-rebinding assessment. |
| C-05 Input size and schema | Request body capped at 64 KiB; scene file and preview time validated by the shared scene engine. | `gateway/server.ts`; invalid-scene/time and deterministic-preview tests passed in CI. |
| C-06 Explicit simulation labeling | Health, capability, and preview responses identify simulation and disabled physical output. | `gateway/server.ts`; gateway tests passed in CI. |
| C-07 Build and static code checks | ESLint, frontend/gateway TypeScript checks, unit/integration tests, production build, and browser tests. | PR CI run [43368044191](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43368044191) passed; Pages deployment [43368627448](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43368627448) succeeded. |
| C-08 HTTP resource bounds | Limits headers to 64, headers to 10 seconds, request receipt to 15 seconds, keep-alive to 5 seconds, and simultaneous connections to 64. | PR #18 CI run [43375463726](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43375463726), post-merge CI [43375854021](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43375854021), and Pages deployment [43375854073](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43375854073) succeeded. This does not establish production hardening. |
| C-09 Firmware output inhibition | Firmware core has no GPIO/PWM or transport initialization; scene/target commands remain rejected and `fw_physical_outputs_enabled()` is hard-coded false. Startup checks the CRC-32 known-answer vector before entering `SAFE_DISABLED`. | PR CI [43377838769](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43377838769) and post-merge firmware CI [43378608098](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43378608098) passed the ESP-IDF v6.1 ESP32-S3 build and portable protocol-core checks. No board flash, serial transport, or hardware test has been performed. |

## 4. Preliminary hazard and threat register

Qualitative items below identify failure paths; no formal severity, probability, or acceptable-risk classification has been performed.

| ID | Hazard or threat | Existing mitigation | Residual risk / required evidence |
| --- | --- | --- | --- |
| H-01 | An operator mistakes a visual preview for aircraft or hardware behavior. | Explicit simulation/offline labels; no physical command path; illustrative geometry caveat. | Human misunderstanding remains possible. Conduct operator usability and labeling review before field use. |
| H-02 | A malformed or hostile scene produces invalid preview output or crashes the process. | 64 KiB body cap, JSON parsing, shared scene validation, bounded preview time, deterministic engine. | Fuzzing, parser/resource analysis, and broader property tests are outstanding. |
| H-03 | An unauthorized local process invokes preview routes. | Loopback-only binding, bearer token, `Host` allowlist, no CORS headers. | Local-machine compromise, leaked token, browser-origin edge cases, and secret rotation are not fully assessed. Perform threat-model and penetration testing. |
| H-04 | Local request flooding or slow upload degrades the machine. | 64 KiB body cap; header/request timeouts and 64-connection cap in PR #18. | No rate limit, process supervisor, resource monitoring, or load test exists. Verify limits and define operational controls before any shared deployment. |
| H-05 | A future change adds a physical command path without adequate safeguards. | Current route set has no actuator endpoint; hardware integration is explicitly out of scope. | Require a separate approved design, code review, authorization boundary, board-specific validation, interlock, and bench evidence before any such change. |
| H-06 | A generic cabin visualization or derived reference is represented as aircraft-exact. | Source and limitation notes distinguish planning references from a cabin fit or certified twin. | Independent source/provenance review and exact approved operator configuration are absent. |
| H-07 | Token or scene data is exposed in logs, browser bundles, or support artifacts. | Token is not emitted by startup or route logging; gateway is not bundled into the browser app. | Secret scanning, log review, distribution review, and operator guidance testing remain outstanding. |

## 5. Release gates and open evidence

The following must remain open until supported by actual artifacts and independent review:

1. **Safety requirements:** identify intended operational context, users, system hazards, safety requirements, traceability, and qualified approvers.
2. **Security engineering:** reviewed threat model; dependency and vulnerability policy; secret lifecycle; security testing; incident and update process; documented residual risk acceptance.
3. **Operator workflows:** authorization model, project ownership, auditability, backup/restore, change review, training, and human-factors validation.
4. **Hardware/bench:** selected board and exact firmware provenance; schematic/BOM; isolation and current limits; independent physical interlock; test plan, instruments/calibration, test records, fault injection, and signed review. No suitable bench is currently evidenced.
5. **OEM/aircraft:** OEM and operator approvals, exact cabin/fixture/controller configuration, interface control documents, conformance and integration evidence, and applicable safety/certification review.
6. **Localization:** professional translations and review, accessibility checks, and locale-specific operator validation before enabling translated operational workflows.

Until those gates are met, retain offline simulation-only positioning. A passing CI suite verifies the tested software behavior; it does not verify physical hardware, operational safety, OEM conformity, or aircraft suitability.
