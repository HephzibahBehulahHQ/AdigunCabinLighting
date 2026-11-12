# CODEX MASTER BUILD DIRECTIVE — AdigunCabinLighting

> **OWNER-APPROVED ORDER CHANGE — READ FIRST (2026-11-12):** [UI FIRST RELEASE & APPROVAL GATE](UI_FIRST_RELEASE_GATE.md) overrides the earlier Phase A/B starting order in this prompt. Codex's first job is to **build the actual landing page and functioning cabin simulator Studio, test it, merge, deploy to the existing public product domain and verify the website**. The owner authorizes this first release and the instruction merge. **Then STOP for explicit owner visual acceptance; do not build AI, gateway or hardware firmware until accepted.** After approval, freeze the exact approved UI design and prevent unrequested redesigns. Keep all safety/airworthiness gates below in force.

**Product:** AdigunCabinLighting · **Division:** HB Elektroniker · **Owner:** Hephzibah Behulah HQ  
**Document:** ACL-PRD-001 v0.1 · **Date:** 2026-11-12 · **Status:** Engineering specification / implementation directive, NOT certified aircraft equipment

> **Codex: build a real, tested lighting-design and hardware-control product, beginning with an executable simulator and electrically isolated laboratory controller. Never claim an aircraft integration, certification, OEM endorsement, compatibility, live telemetry, or deployed capability without verifiable evidence.**

## 0. Mission and non-negotiable outcomes

Create a polished, futuristic yet operationally serious RGBW cabin-lighting software suite enabling authorized engineers, cabin teams, and OEM integrators to design light scenes, visualize cabin zones, simulate fades and timelines, configure actual validated drivers, commission a laboratory test rig, monitor real measurements, and eventually integrate with an aircraft-approved cabin management system through a documented OEM interface. It must be valuable without AI and when offline.

The attached owner reference images show (1) blue-lit multirow aircraft cabins, (2) a VIP jet cabin with pink/green/blue programmable sidewall, ceiling and accent lighting, (3) purple-lit premium economy cabin, (4) a visual color-wheel/scene catalogue, and (5–6) early color-picker and channel-control software. Use their actual geometry, zone separation, and physically plausible light placement as visual direction. DO NOT copy the screenshots as application UI. A companion concept mockup from this task is a design reference, not proof of implemented functionality.

**Products to deliver, all in this repository:**
1. **Cabin Studio** — responsive desktop-first engineering UI and accessible tablet-friendly control UI, running offline for simulations.
2. **Scene Engine** — deterministic, unit-tested RGBW/color/fade/time engine independent of all frontends.
3. **Cabin Digital Twin** — editable cabin/zones/fixtures model and realistic 2D map; 3D view optional after a functional 2D map. This is a visualization, not a physical irradiance certification model.
4. **Local Gateway** — authenticated service translating validated scene commands to supported bench devices; exposes telemetry, logs, and versioned APIs.
5. **Bench Controller Firmware** — compilable, flashed, tested embedded software on a **selected and documented development board**, with outputs to an isolated, current-limited *lab lighting rig* and physical override. Hardware in-the-loop proof is a separate gate.
6. **Adigun BOT lighting copilot** — bounded assistant that proposes and explains, never bypasses deterministic verification or operator approval.
7. **OEM Integration SDK** — typed adapter contract, documented capability discovery and contract tests; aircraft-specific drivers must remain disabled until OEM documentation/permissions/testing are supplied.
8. **Operator documentation, engineering traceability, security evidence, CI, reproducible dev environment, releases and deployment.**

**Reality gates:** UI running ≠ simulator tested; simulator working ≠ hardware connected; hardware bench working ≠ airworthiness approved; integration abstraction ≠ installed airline compatibility; standard referenced ≠ certification; AI proposal ≠ safe command.

## 1. Mandatory canonical references and precedence

Read and adopt, WITHOUT modifying their original visual identity or reimplementing their policy text:

- Global policy **HB-AI-ENGINEERING-001 v2.0**: https://github.com/HephzibahBehulahHQ/hb-AI-policy — canonical operational governance. The user-supplied `hb-AI-policyy` URL is unresolved; use the verified `hb-AI-policy` repository instead.
- Design system: https://github.com/HephzibahBehulahHQ/hb-design-system — authoritative colors, assets, typography, universal-product schema, accessibility, menus, and Adigun BOT contract.
- Corporate identity: https://github.com/HephzibahBehulahHQ/HephzibahBehulahHQ.github.io — identity only.
- Division: https://github.com/HephzibahBehulahHQ/hb-elektroniker — product belongs to HB Elektroniker.
- AI division: https://github.com/HephzibahBehulahHQ/hb-artificial-intelligence — relevant principles, not a runtime backend.
- This product repository: https://github.com/HephzibahBehulahHQ/AdigunCabinLighting .

Required inherited palette: midnight navy `#0B1220`, ivory `#F8FAFC`, corporate gold `#D4AF37`, corporate royal blue `#2563EB`, and HB Elektroniker electric cyan `#22D3EE`. RGBW gradients are **lighting data visualization**, not a replacement corporate identity. One verified official corporate logo in header; product text wordmark “AdigunCabinLighting”; small “BY HB ELEKTRONIKER” accent label; never invent a corporate logo. Support actual full UI localization in English, German, Yoruba, Nigerian Pidgin (technical terminology preserved). Implement GLOBAL-UI-UX-001: transient menus overlay content; never reflow underlying canvas; keyboard, Escape, click-away, pointer and touch semantics verified. Follow design-system `components/AdigunBot` standards including truthful capability registry.

**Design references, NOT APIs or compatibility contracts:** 
- https://aircraftlighting.com/products/pma-products/28vdc-rgbw-mood-led-system/ (another vendor’s marketing claims; do not reuse proprietary code, product naming or assert interoperability).
- https://www.youtube.com/watch?v=5CQgni64R64
- https://www.facebook.com/Behindthehanger1.0/videos/this-is-more-than-just-a-cabin-light-switchthe-airbus-a350s-customisable-led-moo/1453643373414561/
- https://www.youtube.com/watch?v=oHYWBcuaU9E
The three videos are inspiration links, not a verified technical specification. Do not assume their protocols or implementation details.

## 2. Target users and permission boundaries

**Engineer/Integrator:** build cabin map, assign fixture IDs and channel limits, run diagnostics, commission bench hardware; can edit profiles in controlled workflow.  
**Scene Designer/Brand Designer:** create colors, lighting choreography, palettes and approved media content; cannot change electrical limits.  
**Cabin Operator/Crew (future):** select only approved scenes in an OEM-authorized passenger/crew interface; no engineering settings, no direct low-level driver commands.  
**Maintenance Technician:** inspect health, fault history, device firmware versions; privileged bench-only calibration.  
**Administrator/Safety Approver:** review and sign profile/scene version releases, assign roles, revoke access.  
**Read-only Auditor:** export versioned records and traceability without modifying commands.  
**Guest/offline user:** use simulator with ephemeral data only; never assume hardware access.

Partition **DESIGN / SIMULATOR / BENCH / AIRCRAFT-INTEGRATION** modes. The selected mode is prominent on every screen, every API response, every audit record. Default on launch = SIMULATOR with **NO PHYSICAL OUTPUT**. BENCH requires explicit configured device, authenticated authorization, physical interlock and visible connected identity; AIRCRAFT mode remains locked until externally authorized OEM integration, controlled hardware, safety assessment and airworthiness approvals.

## 3. Vision: exact screens and interactions

Design a cohesive command-center, not a website with colored buttons. Desktop target 1920×1080/1440×900; usable from 1280×800; responsive touch tablet ≥768px; keyboard-first engineering use. Default workspace:

- **Top chrome**: verified corporate logo/text fallback; “ADIGUN / CABIN LIGHTING”; aircraft/profile name and revision; breadcrumb; mode pill “SIMULATION · NOT CONNECTED”; sync state; notifications; language; theme; user.
- **Left rail**: Cabin Overview, Scene Studio, Zone Mapping, Choreography Timeline, Live Preview, Hardware & Diagnostics, AI Copilot, Library/Brand Palettes, Test & Compliance, Settings. Tooltips and collapsible labels.
- **Center**: panoramic cabin image/2D digital twin with clickable ceiling coves, sidewalls L/R, window surrounds, footwell, monuments, galley accent, seat-reading, entry/exit zones. Colored translucent zone overlays on the real aircraft perspective, each independently selectable, named and status-indicated. A secondary top-down cabin schematic provides accurate addressable fixtures by row/zone. Fit-to-view, zoom, pan and selection work.
- **Right inspector**: selected zone, hardware channel binding, RGBW wheel, hue/saturation, numeric channel controls 0–100%, intensity, color temperature **only if fixture supports calibrated CCT/tunable white**, fades, duration and easing, palette swatches, scene controls. Large apply-to-simulator button; separate gated bench action with explicit confirmation and measured feedback. Show desired vs reported values.
- **Bottom transport**: scene timeline, markers and keyframes, scrub, preview play/pause, loop, transitions (crossfade, sequential sweep, sunrise/sunset, breathing), current timestamp, queue and undo/redo. Add preview mode with deterministic clock.
- **Adigun BOT non-modal floating panel**: “Design a 12-minute sunrise transitioning from warm-white window surrounds to teal ceiling”; outputs an **editable draft** including affected zones, channel targets, duration, estimated current budget and rule-validation warnings. Button labels “Preview”, “Accept Draft”, “Discard”; NEVER silent hardware actuation.
- **Connection health ribbon**: simulator synthetic state vs real measured state, gateway latency when measured, fixture online counts, controller firmware/serial, electrical faults, audit event timeline. “Data source: simulated / live bench / unavailable” labels.
- **Operator scene launcher**: one-touch approved scenes and cabin transition preview with crew-scope role and override priority, but no access to raw electrical controls.

Constrain legibility, WCAG 2.2 AA where practical, non-color-only signals, reduced motion, high-contrast mode, ARIA announcements and readable touch targets. Performance goal: control interactions remain responsive under 60-fps UI animation targets on reference hardware; log actual benchmarks. No layout shifting on popovers.

### Scene library: implement editable, versioned examples

Create genuine scene definitions and expected deterministic outputs, not dead cards:
- **Boarding Welcome**: warm-white sidewalls, indirect cyan ceiling, slow 8-second fade.
- **Takeoff / Landing**: neutral, dimmed, operator-approved profile with protected egress paths (actual levels depend on approved installation; do not suggest compliance).
- **Daylight Cruise**: cooler white indirect light.
- **Sunrise**: amber → coral → soft neutral over a programmable duration, gradual zonal stagger.
- **Sunset**: golden amber → violet-blue → low-intensity deep blue.
- **Northern Lights**: slow teal/indigo waves across ceiling coves, no high-rate flashing.
- **VVIP Signature**: brand palette on ceiling/windows/floor plus cabin-specific profile.
- **Dining**: localized warm-white tables/monuments, low ambient.
- **Cinema / Sleep**: low ambient, controllable reading lights only where authorized.
- **Cleaning / Maintenance**: high white output and diagnostics, available only to appropriate role and never as an unapproved in-flight mode.
- **Emergency/egress**: **not a creative scene**. Provide a locked safety-owned channel indicator; do not integrate with, override, simulate as flight-approved, or disable emergency lighting. No application command may control required emergency egress lighting unless separately certified and authorized; default design excludes it.

Expose scene inheritance/variants per cabin, brightness ceilings and rules. Support edit history, signed approval states, compare/diff, revert and export/import with schema validation. Presets are examples and cannot claim aircraft suitability.

### Precise designer capabilities

- Full spectrum 4-channel R/G/B/W per fixture, gamma-correct dimming, per-channel current/PWM limits, white-point calibration, calibrated color mixing; RGB vs RGBW projection documented; distinguish linear/scRGB/sRGB and device values.
- Palettes via HEX, RGB, HSL/HSV and LAB/LCH (UI conversions by tested library); map to fixture-gamut with clamping and visible warnings. Color picker requires accessible numeric alternative; cannot claim physically exact color without fixture calibration.
- Per-group and per-seat/row assignments only where connected fixture map supports that granularity. Group zones logically; bulk edit, linked/unlinked controls, isolation/solo, lock zones.
- Animation curves linear/ease-in/ease-out/ease-in-out, timeline keyframes, per-zone offset, gradients, one-time or loop, stateful pause/stop/resume, no blink/strobe modes by default.
- Fade engine 10–60Hz commanded update as configured, but real driver sampling/timing per device capability; inhibit excessive writes, bound transitions and enforce fixture thermal/electrical limits.
- Brand-color import/export only in approved customer tenancy with audit and license rights. Store swatch palettes and signed scene packages locally.
- Contextual tooltips display physical limitations, not blanket promises like “no heat” or “millions of colors” for untested hardware.
- Optional natural-language scene drafting and ambient-light recommendations **only on approved sensor inputs**; never infer passengers’ health, emotions or identities.
- Scheduling by flight phase is **not automatic** without reliable, approved phase-of-flight input and OEM priority arbitration. In the MVP use a SIMULATED clock/phase; a manual bench timeline is allowed.

## 4. Architecture — independent, replaceable and testable

Use a TypeScript monorepo with PNPM, Vite, React, strict TypeScript for UI; Rust for deterministic engine/gateway **if the environment supports it**, otherwise justify a typed TS engine + auditable Rust gateway implementation path. Avoid a complex cloud dependency for the first working build. Suggested packages:

```text
apps/studio/                 React PWA / desktop-first shell, local/offline mode
apps/operator/               limited approved-scene touch UI
apps/gateway/                local authenticated HTTP+WebSocket gateway service
packages/scene-engine/       pure deterministic color/timeline/scheduling library
packages/cabin-model/        aircraft profiles, zones, fixtures, validation
packages/protocol/           typed versioned protocol + generated schemas
packages/ui/                 approved design tokens and reusable components
packages/device-sdk/         capability-driven adapters: simulator, serial-bench, OEM-stub
packages/ai-lighting/        server-side validated AI advisory tools
firmware/bench-controller/   real compilable target code / board & pin map
hardware/                    approved lab BOM, circuit, power budget, pinout, isolation
docs/                        architecture, ADRs, safety, threat model, operator manuals
tests/e2e/                   Playwright core flows
tests/hil/                   opt-in hardware smoke/fault/latency tests
.github/workflows/           lint, tests, build, SBOM/security, static deploy
```

UI must work without gateway and without Internet; IndexedDB/local files for scene drafts (proper migrations). Ship a simulator adapter with deterministic state, fault injection, fixture visibility and timestamps explicitly marked simulated. Avoid Supabase or cloud account plumbing unless a specific authorized use case and actual backend exist. Document local data backup/export.

Implement **ports/adapters**: `SceneEngine` and `CabinModel` must not import React, AI SDKs or device transports. `DeviceAdapter` interface has `discoverCapabilities()`, `connect()`, `readTelemetry()`, `validateTargets()`, `prepare()`, `commit()`, `abort()`, `disconnect()`. Hardware adapters cannot expose a capability unless exercised and validated. Use timeouts, retry windows, bounded queues, cancellation, idempotency and safe reconnection state reconciliation. No optimistic “connected” icon before an authenticated device handshake.

### Data contracts, strict schemas

Use JSON Schema or Zod with versioned migration. Core records:
```ts
type Mode = "DESIGN" | "SIMULATION" | "BENCH" | "AIRCRAFT_LOCKED";
type Channels = { r: number; g: number; b: number; w: number }; // each integer [0..65535] linear setpoint
type Zone = { id: string; displayName: string; cabinId: string; fixtureIds: string[]; groupIds: string[]; protected: boolean };
type FixtureCapabilities = {
  fixtureId: string; driverId: string; channels: ("R"|"G"|"B"|"W")[];
  maxLinearChannel: Channels; maxTotalCurrentMa?: number; maxBoardTempC?: number;
  minStepMs: number; supportedEasing: string[]; physicalCalibrationVersion?: string;
  telemetry: ("temperature"|"current"|"voltage"|"fault"|"status")[];
};
type Keyframe = { atMs: number; zoneId: string; channels: Channels; easing: "linear"|"easeIn"|"easeOut"|"easeInOut" };
type Scene = { id: string; schemaVersion: number; cabinProfileId: string;
  name: string; version: number; approval: "draft"|"reviewed"|"approved"|"retired";
  durationMs: number; keyframes: Keyframe[]; safetyPolicyId: string; author: string;
  createdAt: string; hash?: string };
type CommandEnvelope = { protocolVersion: number; requestId: string; sequence: number;
  mode: Mode; controllerId: string; action: "prepare"|"commit"|"abort"|"read"|"stop";
  revision: string; deadlineUnixMs: number; payload: unknown };
```
Frame `Channels` values normalized in **linear** intensity and converted through per-driver calibration/gamma; forbid implicit sRGB→PWM mixing. Set maxCurrent only from measured/datasheet values; null means not known and blocks real output authorization where required. Use UUIDs, referential integrity, versioned cabin profiles and immutable approval history. Persist actual vs desired channel state separately with source, time and quality flags.

API examples, all versioned under `/api/v1`:
- `GET /health` (exposes simulator/gateway state explicitly)
- `GET /devices` and `GET /devices/:id/capabilities`
- `GET/POST /cabins`, `GET/POST /scenes`, `POST /scenes/:id/validate`
- `POST /simulator/play`, `POST /simulator/step`, `POST /simulator/inject-fault`
- `POST /bench/prepare`, `POST /bench/commit`, `POST /bench/abort` (strict auth, lease, confirmation, local physical interlock)
- `GET /telemetry`, `WS /events`, `GET /audit/export`, `GET /versions`.
Return structured error code, retryable flag, mode, source, command ID, real acknowledgement state. No fake green checks or fabricated telemetry. Built-in OpenAPI, contract tests and request tracing with secrets redacted.

### Scene evaluation requirements

A pure function `evaluateScene(scene, cabin, ms)` returns exact clamped per-zone setpoints, affected fixture IDs, validation notices and provenance. Define interpolation domain, rounding, endpoints, offsets, conflicting keyframes, precedence and loop behavior. Freeze-time tests assert reproducibility. Resolve priority as: **physical safety interlock / independent safety channel > approved OEM management interface > maintenance lockout > authorized crew/operator control > designer preview/AI proposals**. This precedence is a proposed architecture and requires OEM validation before any aircraft use. Every lower-priority command must be rejected or held when higher-priority owner is active.

## 5. Real hardware: safe incremental plan

**Do NOT connect a prototype to a live aircraft, aircraft power bus, installed CMS, emergency circuit, or passenger systems.** Deliver actual firmware and host interface on an electrically isolated tabletop rig first. Target in-v1 a **documented ESP32-S3 development board using ESP-IDF (C/C++ with FreeRTOS)** because it supports USB-CDC, network/BLE development and automated tests. Document tested exact part number and SDK version before claiming support. Use devboard GPIO only as logic-level signals into a properly designed and protected isolated RGBW power-driver module. A bare microcontroller GPIO is NOT a lamp power output. No connection to 28 VDC or 115 VAC lamps without driver design, qualified power electronics, approval and lab validation.

**Lab reference block diagram:**
```text
Cabin Studio (offline desktop/PWA)
  -> authenticated Local Gateway on host (loopback by default)
    -> USB CDC serial (initial approved transport; framed CRC protocol)
      -> ESP32-S3 bench controller (watchdog, state machine, capability handshake)
        -> current-limited, fused, isolated 4-channel low-voltage LED driver
          -> separate protected BENCH RGBW LED strip/test board
        <- actual voltage/current/temperature/fault sensors only if installed
    <- controller ACK + actual readback (never invent)
  [physical keyed enable / E-stop / local override independent of desktop app]
```
Optional transport expansions (RS-485/CAN/Ethernet/BLE) must be subsequent separate adapter projects with interface-control documents, security, test evidence and OEM sign-off. Do not assert a protocol merely because a vendor name appears in reference marketing. BLE pairing must be authenticated and opt-in; absent real crypto/capabilities, leave BLE disabled. For airplane controls, compare isolated data planes, EMC, separation, and OEM safety priorities.

### Firmware deliverables and minimum behaviors

- Reproducible ESP-IDF project, pinned toolchain, `sdkconfig.defaults`, build/flash/test instructions and real CI compile.
- Finite state machine: `BOOT_SELF_TEST`, `SAFE_DISABLED`, `READY`, `ACTIVE_BENCH`, `FAULT_LATCHED`, `MAINTENANCE` and `UPDATING`; well-defined transitions/invariants.
- Device identity, unique key provisioning, firmware semantic version, protocol version, serial number, capability readback, firmware build hash, calibration CRC.
- Fixed-size validated frames with SOF, version, length, sequence, CRC32 and message type; choose COBS/SLIP framing with documented worst-case length; exactly-once **effect** via sequence/idempotency window where feasible, never promise exactly-once transport.
- Commands `HELLO`, `CAPABILITIES`, `AUTH_BEGIN`, `READ_STATUS`, `SET_TARGETS`, `PLAY_SCENE`, `STOP`, `HEARTBEAT`, `CLEAR_FAULT` (privileged/local reset), `ENTER_BOOTLOADER` (maintenance).
- Explicit electrical limits per channel, total current/thermal derating and board-specific PWM frequency/resolution selected after measured EMI/driver feasibility; smooth DMA/timer-based fades without unbounded main-loop jitter. Document measured output nonlinearity and calibration.
- Feed watchdog only after healthy scheduled work; fail-safe on malformed frames, authentication failure, brownout, sensor fault, bus loss, overtemp, overcurrent, short circuit and E-stop **according to a hazards-reviewed safe state**. Do not assume darkness is safe; use independently approved steady safe scene or inhibit as risk assessment requires.
- Persistent settings with checksums, wear limits, rollback, factory reset, explicit commissioning locks and invalid-config rejection.
- A/B signed firmware OTA/DFU and secure boot if supported and validated. Until implemented, update only via documented local wired process in safe maintenance state; firmware signing keys NEVER in repo. No over-the-air updates in flight.
- No Python/web/AI logic in the MCU safety path. Deterministic firmware remains functional when PC/gateway/Internet/AI disappear.
- Export pin map, wiring diagram and approved BOM; include electrical interlock/emergency cutoff wiring independently reviewed. No direct 115VAC experiment instructions.
- Define GPIO behavior at reset and during firmware update (high impedance/driver disabled), active-low polarities, bootstrapping hazards, default sink states and sensor calibration gates.

### Wire protocol examples (normative intent, implement exact binary spec and tests)
```text
HOST -> DEVICE: PREPARE(seq=42, device="BENCH-01", sceneHash, targets4x16bit, expiresAt)
DEVICE -> HOST: PREPARED(seq=42, accepted=true, limitsHash, mode=READY)
HOST -> DEVICE: COMMIT(seq=43, preparedSeq=42, operatorAuthContext, monotonicDeadline)
DEVICE -> HOST: ACCEPTED(seq=43, appliedRevision) [not equivalent to measured output]
DEVICE -> HOST: TELEMETRY(monotonicTime, applied4x16bit, measuredCurrent?, temp?, faultBits, dataQuality)
```
Never send a raw AI-generated packet. Gateway validates parsed intent, role, mode, scene/profile version, fixture capabilities, current/thermal limits, locality, safe profile, rate and sequence; MCU separately revalidates all meaningful limits and interlocks. For commands requiring acknowledgement, timeouts yield UNKNOWN/RECONCILE, **never success**. Include replay defenses and monotonic deadlines.

### Hardware selection and electrical engineering gates

Before wiring: BOM with exact vendor parts and traceable datasheets; electrical supply architecture; overvoltage/reverse polarity, fuses and per-channel limits; grounding/isolation and cable lengths; PCB creepage/clearance; wiring harness; LED ratings, transient/EMC planning, temperature budget; power/thermal/current calculations and test records. Test initially at low-energy SELV lab supply appropriate to selected drivers. Flight 28 VDC/115 V interfaces demand separately qualified equipment and OEM signoff, not this devboard. No claim that RGBW LEDs emit no heat.

### Integration with OEMs

Create `docs/integrations/OEM_INTERFACE_REQUIREMENTS.md` with unanswered questions and ICD template: aircraft type/options; CMS controller part number and firmware; approved commands/events; electrical interface; voltage and isolation; arbitration/phase-of-flight and crew overrides; emergency/egress independence; security and update restrictions; timing and diagnostics; ownership/license; install approval; tests. Adapter states = `unsupported`, `specified`, `bench_verified`, `OEM_verified`, `airworthiness_approved`. ALTO, Honeywell Ovation, Collins Legacy, Pacific, Audio International and other vendor names are **candidate research targets only**, not currently supported products. No reverse engineering of avionics or bus spoofing to unlock aircraft behavior.

## 6. AI: useful engineering copilot with hard boundaries

Adigun BOT should support: text-to-draft-scene, “make sunset warmer”, natural-language explanation of channel curves, translate operator instructions, analyze real instrumented bench logs, recommend non-binding fixes based on evidence, identify out-of-range/unmapped fixtures, generate editable scene timelines and simulation comparisons, explain operating limits and propose testing checklists. Access only current authorized cabin/profile/mode and sanitized state. Use deterministic validators independent of LLM.

All actions typed, allowlisted, server-side authorized, validated and displayed as human-readable preview/diff. **A model never receives a direct hardware control socket, credentials, bootloader access or firmware flashing tool.** No autonomous real-hardware updates, no AI-driven safety arbitration, no user intent inference from camera/microphone/passengers. Offline mode shows deterministic suggestions or “AI unavailable” truthfully. Record provenance, model version, acceptance, rejection and actual result. Defend against prompt injection in imported scene files/logs. LLM failure must not affect existing lighting. Treat AI-generated curves as untrusted design drafts until approved.

## 7. Security, privacy, quality and availability

- Threat model for attacker-controlled web UI, hostile USB device, replay, compromised gateway, insecure BLE, firmware tamper, unauthorized technician, scene injection, loss of connectivity, physical interlocks, supply faults, overtemperature.
- Localhost gateway by default, no unauthenticated remote browser access; explicit opt-in network exposure with TLS/mTLS where appropriate, authenticated sessions and role checks. Strict CSP, CORS origin allowlist, CSRF protections, transport validation, output escaping, signed firmware releases; pin dependencies and produce SBOM.
- Least privilege, audit every write/approval/device attempt with sanitized before/after diff, durable timestamp and actor. Retention/export/deletion policy. No secrets in source or GitHub workflows.
- Separate physical actuation service from PWA/static hosting. GitHub Pages may host only public product information and simulator frontend, NEVER the gateway or secrets.
- Rate limits, operation IDs, proper disconnect states, backpressure, recoverable store and explicit safe reconnection.
- Security testing: protocol fuzzing, invalid CRC/length, timeout/replay, forged approvals, cross-tenant access, model tool prompt injection and signed update rejection.
- Product must work in offline simulator without login; no paid provider required for first run.

## 8. Airworthiness, standards and independent assessment

Treat the following as **applicability assessment inputs** to be decided by certified systems/safety engineers, DER/ODA/EASA-approved organizations and OEMs, not automatic claims of certification:
- SAE ARP4754A/ARP4754B (system development), SAE ARP4761/ARP4761A (safety assessment and FHA/PSSA/SSA), depending on OEM baseline.
- RTCA DO-178C / EUROCAE ED-12C for airborne software, assurance level only after system safety assessment.
- RTCA DO-254 / EUROCAE ED-80 for applicable complex airborne electronic hardware.
- RTCA DO-160G (environment/EMI; verify current revision/amendments at implementation).
- RTCA DO-326A/ED-202A and DO-356A/ED-203A for applicable aircraft cybersecurity security processes.
- ARINC, Airbus, Boeing and CMS ICDs **only when legally obtained for this integration**; never assume ARINC 429/664/CAN or a proprietary CMS protocol without evidence.
- Applicable EASA Part 21, CS-25/CS-23, FAA Part 21 and 14 CFR Part 25/23 aspects only as established by installation applicability.
- Human factors, electromagnetic interference, cabin emergency lighting independence, wiring, software configuration, battery/power contingency and maintenance procedures.

Create: system boundary & intended function; safety hazard list; functional hazard analysis; proposed DAL rationale pending OEM acceptance; safety requirements trace matrix; configuration management; verification coverage; requirements-based tests; fault-tree/FMEA where appropriate; supplier management; certifiability gap assessment. A lab prototype must be conspicuously labeled **NOT FOR FLIGHT** in docs, UI and firmware build metadata. Never advertise “Airbus/Boeing certified”, “works on A350”, or “certified with Ovation” based only on an image or public video.

## 9. Required test matrix: measurable evidence, not slogans

**Unit:** color conversions including white channel/gamma; boundary 0/65535; interpolation at exact timestamps; nonmonotonic/duplicate keyframes rejection; conflicts and priority; schema migration; scene diff/revert; formatting and localization.  
**Integration:** UI→scene engine→simulator state; gateway contract; permissions; roles; preview-before-commit; retries, reconnect reconciliation, event ordering, audit; server-side AI action denial.  
**Browser E2E (Playwright):** homepage loads without blank screen, scene cards operate, select ceiling/sidewall/footwell, sliders alter digital twin, create a keyframe, preview timeline, save/reopen, import/export, undo/redo, open BOT, cancel an AI draft, responsive desktop/tablet, accessibility, no layout shift in popovers. Video/screenshot artefacts on failure. Avoid cancelling tests due to competing servers or port collisions; deterministic startup, teardown and timeout budgets.  
**Firmware unit/simulated:** complete state transitions; invalid frame, CRC/length, replay, authorization, heartbeat timeout, limits rejection, watchdog, reset inactive outputs, thermal/current protective actions, safe state and fault latch.  
**HIL (only on physically available rig):** measured PWM with scope/logic analyzer, current and temperature sensors cross-checked against calibrated instruments, power loss/restart, USB disconnect, E-stop, overcurrent fault and output safe state, firmware rollback/signature. Record instruments, part numbers, bench wiring and oscilloscope captures; skip truthfully when hardware absent.  
**Performance:** target input reaction <100 ms in local simulator on reference machine, stable UI, validated jitter at MCU, measured heartbeat and telemetry latency, long soak and fault injection; record measured baseline before claiming any numeric acceptance.  
**Security:** run SAST/dependency scans, fuzz frame parser, schema injection tests, route authorization and RCE defenses.  
**Flight readiness:** *not a CI pass*. External system and airworthiness reviews must be completed before any live aircraft installation.

Definition of Done for each feature = code + tests + user documentation + verified demo steps + mode/source labeling + accessible errors + update of requirements trace. A mock image, placeholder service or fake sensor does not meet DoD.

## 10. Detailed sequenced execution plan for Codex (do the work, do not merely produce plans)

**Phase A — Repository foundation**
1. Inspect current `main`, status, default branch, CNAME and existing work. Do not delete unrelated files. Read canonical standards and pin their commit refs in local `docs/standards-baseline.md`.
2. Add `AGENTS.md` (product rules), `product.config.json` based on universal schema, architecture ADRs, threat model, hardware safety gates, traceability IDs, no-secrets convention, CI.
3. Bootstrap strict monorepo and checked commands `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; document environment. Preserve existing CNAME.
4. Choose deployment approach: static public simulator (same existing hostname after authorized merge/deploy), local gateway independently installed on engineer host. Do not use GitHub Pages as an aircraft control server.

**Phase B — First genuinely running software**
5. Implement cabin profile/fixture map schemas with sample *explicitly simulated* private-jet and narrowbody widebody **illustrative** profiles; no false aircraft model fit claims.
6. Implement deterministic RGBW engine, gamma/white calibration API and timeline playback; test boundary and conflict cases.
7. Implement working offline scene editor, zone selection, realtime cabin preview, timeline scrubbing, library import/export, keyboard undo/redo, polished responsive layout and full localized strings.
8. Capture screenshot proof for 1920×1080 and tablet, browser-video proof for scene editing, no console errors; save artifacts in CI not as invented functionality.

**Phase C — Working local gateway and actual bench firmware**
9. Implement local gateway in loopback mode with simulator; strict auth, API, event stream, typed adapter, real error handling.
10. Implement firmware on documented selected ESP32-S3 board and **build it successfully**. Build a protocol conformance test and serial loopback integration. Document BOM and safe wiring for an isolated low-voltage LED bench.
11. Once permitted physical rig exists, flash, read identity/capability, independently measure four channels, record telemetry if equipped, verify E-stop/fault behavior; update controller support status from `simulated` to `bench_verified` only with evidence. If rig absent, report hardware gate blocked, leave HIL NOT TESTED.
12. Implement role-gated bench commissioning screen with true connect/disconnect, prepare/confirm/commit/reconcile and instrumented statuses. Display in mode banner at all times.

**Phase D — Intelligent / OEM-readiness**
13. Integrate Adigun BOT only after real adapter tools and deterministic validation exist; all AI edits are proposals and cannot directly actuate.
14. Deliver OEM ICD worksheet, integration SDK and `unsupported` stub adapters with tests (never misrepresent compatibility).
15. Complete docs: installation, operator/technician manuals, architecture, API schema, firmware flashing, hardware bill of materials, risk log, certification gap list and release notes.

**Phase E — Quality, review and authorized deployment**
16. Run full CI: formatting, lint, TS types, unit, contract, firmware build, Playwright, accessibility and secrets/dependency checks. Capture command, revision and exact pass/fail receipts.
17. Provide traceability from REQ identifiers to files and tests. Fix failures; do not mute tests. Demo the offline simulator end-to-end and the bench mode only if real connected.
18. Work in dedicated branches and open scoped PRs. No merge to main or deployment without authorization per global policy. After authorized deployment, verify actual URL via browser, HTTPS, console and critical scene flow. Report not-tested limits.

Codex must **start implementing Phase A/B**, not stop after emitting a concept image or README. Keep an incremental vertical slice runnable at every checkpoint. No invented API keys, mock “LIVE” badges, inactive buttons, blank production root, or TODO-only hardware source.

## 11. Acceptance IDs and minimum end-to-end narratives

| ID | Acceptance requirement | Evidence |
|---|---|---|
| ACL-001 | Offline app loads nonblank at product root | Playwright E2E screenshot |
| ACL-002 | Select a named cabin zone and alter its RGBW values | UI+engine integration assertion |
| ACL-003 | Saved scene reopens with exact versioned keyframes | persistence migration test |
| ACL-004 | Sunrise preview renders repeatably at 0%, 50%, 100% | deterministic unit snapshots |
| ACL-005 | Preview never produces physical I/O | adapter spy test |
| ACL-006 | Hardware actions rejected by default with no bench connection | auth+mode tests |
| ACL-007 | Bench commands require permission, valid revision, confirm and device capability | gateway integration tests |
| ACL-008 | Device parser rejects CRC/length/replay/overrange frames | firmware tests |
| ACL-009 | Loss of PC link triggers explicitly defined tested MCU-safe response | HIL or NOT TESTED |
| ACL-010 | Actual telemetry visibly distinct from desired command and simulated data | integration / HIL |
| ACL-011 | Adigun BOT only creates editable drafts, no direct device calls | adversarial tool tests |
| ACL-012 | Scene/fixture export/import verifies schema and version | contract tests |
| ACL-013 | All four supported languages cover actual feature strings | localization check |
| ACL-014 | Menu/panel interactions never shift cabin canvas | Playwright layout tests |
| ACL-015 | Screens and controls accessible by keyboard/touch | a11y tests |
| ACL-016 | Security and provenance events trace operator, mode and device | API tests |
| ACL-017 | CI builds actual firmware on selected board | reproducible CI log |
| ACL-018 | OEM adapters remain unsupported until genuine ICD/hardware evidence | contract tests |
| ACL-019 | Public static app contains no hardware credentials or gateway backend | release inspection |
| ACL-020 | Airworthiness/flight suitability remains an explicit independent approval gate | reviewed safety case |

## 12. Deliverables and handoff format

At completion, produce runnable source and build receipts, not just images:
```text
README.md (quickstart and exact working features)
AGENTS.md (scoped developer instructions)
product.config.json (approved inherited brand config)
docs/PRODUCT_REQUIREMENTS.md
docs/ARCHITECTURE.md + ADRs + architecture diagrams
docs/SCENE_SCHEMA.md + schemas and examples
docs/HARDWARE_INTEGRATION.md + lab BOM + wiring + power budget
docs/PROTOCOL.md + golden frames + fuzz/test corpus
docs/OEM_INTERFACE_REQUIREMENTS.md + ICD worksheet
docs/SAFETY_AND_CERTIFICATION_GAP.md + requirements trace
docs/SECURITY.md + threat model
docs/HELP.md (operator + engineer manual)
docs/TEST_EVIDENCE.md (actual receipts / explicit NOT TESTED)
apps/ + packages/ + firmware/ + tests/ + .github/workflows/
```

**Engineer handoff report:** `STATUS` / `Done` / `Tested` / `ESTIMATED FINISH TIME` / `ETA` / `Next`, following canonical global policy. Indicate version and mode at every claim; never equate a polished mockup with a flyable product.

**Design north star:** A cabin-lighting “mission studio” combining editable physical zone maps, designer-grade scene motion graphics, real diagnostics and an AI scene co-pilot. The experience should feel years ahead of a traditional dimmer interface while remaining testable, understandable and safe when offline, disconnected or malfunctioning.
