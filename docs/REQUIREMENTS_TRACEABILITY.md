# Master-plan acceptance traceability

This table maps the acceptance IDs in [CODEX_MASTER_PROMPT.md](CODEX_MASTER_PROMPT.md) to current code and verification evidence. Status records implementation evidence only; it is not certification evidence. `NOT TESTED` means the required physical or external evidence does not exist. Recheck this table when code, CI, or external approvals change.

| ID | Requirement | Status | Evidence | Remaining gap |
|---|---|---|---|---|
| ACL-001 | Public root is nonblank | PASS | `e2e/studio.spec.ts` landing route test; Pages smoke check recorded in `RELEASE_STATUS.md` | None for the tested route and viewport. |
| ACL-002 | Named zone RGBW edits affect the local scene preview | PARTIAL | `e2e/studio.spec.ts` checks named-zone editing and derived simulator output; `src/scene-engine.test.ts` checks per-zone interpolation | No dedicated assertion connects a selected edit to its rendered 3D pixels. Offline simulation only. |
| ACL-003 | Saved scene reopens with exact versioned keyframes | PARTIAL | `src/App.tsx` local project persistence; E2E persistence and scene import/export tests | No dedicated assertion that a full custom keyframe sequence round-trips unchanged after save/reopen. |
| ACL-004 | Timeline preview is deterministic at boundary and midpoint values | PARTIAL | `src/scene-engine.test.ts` interpolation tests; `e2e/studio.spec.ts` timeline playback test | No reviewed golden-output snapshots for every named preset at 0%, 50%, and 100%. |
| ACL-005 | Preview never invokes physical I/O | PASS | No hardware route in `gateway/server.ts`; false output claims in gateway/OEM tests; `firmware/bench-controller/main/firmware_core.c` hard-disables output | No physical I/O exists to test; keep this boundary fail-closed. |
| ACL-006 | Hardware operation is rejected by default | PASS | `packages/oem-sdk/src/index.test.ts`; firmware host test; gateway has no actuator route | Firmware transport and device identity are not implemented. |
| ACL-007 | Bench commands require roles, revisions, confirmation, and capabilities | NOT IMPLEMENTED | No bench command API or role service is present | Requires an approved bench architecture, authenticated device, interlock, and role model. |
| ACL-008 | Firmware parser rejects CRC, length, replay, and overrange frames | PARTIAL | `firmware/bench-controller/tests/host_test.c` covers bad CRC, length bounds, duplicate/stale sequence rejection, wraparound, and ambiguous half-range values | The sequence guard is per-boot and unauthenticated; forged future sequences, authenticated replay protection, command payload ranges, transport integration, and fuzz evidence are absent. No hardware behavior is verified. |
| ACL-009 | PC-link loss reaches a tested MCU safe response | NOT TESTED | Firmware notes explicitly mark serial/HIL behavior NOT TESTED | Requires selected hardware, transport, rig, and witnessed fault testing. |
| ACL-010 | Actual telemetry is distinct from desired and simulated values | NOT IMPLEMENTED | Gateway capabilities report no telemetry source | Requires real sensors/device protocol and provenance-bearing telemetry. |
| ACL-011 | Adigun BOT creates editable drafts and cannot actuate | NOT IMPLEMENTED | No runtime copilot integration exists; gateway exposes no actuator route | Requires an approved AI provider/runtime and adversarial tool-denial tests. |
| ACL-012 | Scene import/export validates schema and version | PASS | `e2e/studio.spec.ts` import/export test; shared `validateSceneFile` tests | No aircraft-fit or OEM validation is implied. |
| ACL-013 | English, German, Yoruba, and Nigerian Pidgin cover all feature strings | NOT IMPLEMENTED | Current product strings are English | Reviewed translation resources and locale QA are required; Studio remains locked in English. |
| ACL-014 | Menus and panels do not shift the cabin canvas | PASS | `e2e/studio.spec.ts` menu and viewport tests | Coverage is limited to the checked routes, states, and viewports. |
| ACL-015 | Controls support keyboard, touch, and accessibility requirements | PARTIAL | Playwright navigation checks and axe scan in `e2e/studio.spec.ts` | Full assistive-technology, touch-device, and human accessibility review is outstanding. |
| ACL-016 | Security/provenance events identify operator, mode, and device | NOT IMPLEMENTED | No account, audit, or device identity service exists | Requires authenticated operator identity, retention policy, and event review. |
| ACL-017 | CI builds firmware for the selected physical board | PARTIAL | ESP-IDF CI compiles the fail-closed ESP32-S3 software target | Exact board/module selection, flash, and hardware behavior are NOT TESTED. |
| ACL-018 | OEM adapters remain unsupported without genuine evidence | PASS | `packages/oem-sdk/src/index.ts` and contract tests default to `AIRCRAFT_LOCKED` with no command API | No vendor or aircraft is supported; approved ICD and conformance evidence are absent. |
| ACL-019 | Public static build contains no gateway backend or hardware credentials | PASS | Vite entry points are the browser app; gateway starts separately from `gateway/start.mjs`; static release workflow publishes `dist/` | Recheck built output and secret scan for every release. |
| ACL-020 | Airworthiness and flight suitability remain independent gates | PASS | `SAFETY_SECURITY_EVIDENCE.md`, `RELEASE_STATUS.md`, and `firmware/bench-controller/README.md` state the independent approval and NOT TESTED boundaries | Qualified independent safety/OEM/operator reviews remain required before any operational claim. |
| Master plan §9 | Offline scene revision diff reports schema-validated changes | IMPLEMENTED | `operator/scene-diff.ts`, `operator/scene-file.ts`, and their unit tests; CLI documented in `OPERATOR_WORKFLOWS.md` | Human review remains necessary; the report does not approve an aircraft fit or interpolate every point in time. |

## External evidence gates

- **Hardware/HIL:** no exact board/module, validated driver, isolated current-limited bench, independent physical interlock, calibrated instruments, or witnessed results are recorded. Keep HIL `NOT TESTED`.
- **OEM/aircraft:** no approved cabin fit, OEM contract/ICD, licensed geometry, integration SDK authorization, or conformance result is recorded. Keep all OEM adapters `unsupported`.
- **AI:** no provider account/configuration or approved data-handling policy is recorded. Any future integration must be advisory and pass adversarial no-actuation tests.
- **Localization:** reviewed translations and locale-specific quality/accessibility evidence are not present.
- **Safety/security:** independent qualified review, penetration testing, threat-model approval, risk acceptance, and operational safety evidence remain outstanding.
