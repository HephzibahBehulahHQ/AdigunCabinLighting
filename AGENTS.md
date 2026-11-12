# AdigunCabinLighting — Codex instructions

> **FIRST PRIORITY:** Follow [docs/UI_FIRST_RELEASE_GATE.md](docs/UI_FIRST_RELEASE_GATE.md). Build and deploy the genuinely working **landing page `/` + Studio `/studio` first**. Owner explicitly authorizes that tested first release to be merged and deployed. Verify the live public URL, then **STOP and request visual approval**. Freeze approved visual baseline; subsequent AI/hardware work may not silently redesign it. This sequencing takes precedence over other product milestones, never over physical safety or required tests.


Read [the complete build directive](docs/CODEX_MASTER_PROMPT.md) before implementation.

## Precedence and ownership
- **Global engineering policy:** [HB-AI-ENGINEERING-001 v2.0](https://github.com/HephzibahBehulahHQ/hb-AI-policy). The user-provided `hb-AI-policyy` name is unresolved.
- **Brand/design/BOT:** [hb-design-system](https://github.com/HephzibahBehulahHQ/hb-design-system) incl. palettes, one-logo, GLOBAL-UI-UX-001 and Adigun BOT.
- **Division:** [hb-elektroniker](https://github.com/HephzibahBehulahHQ/hb-elektroniker); **product code, firmware, tests, CI, deployments:** this repo only.

## Hard constraints
1. Implement an actually running, tested simulator first; do not represent stills/placeholders as functional.
2. Default to **SIMULATION — NOT CONNECTED**. Keep DESIGN / SIMULATION / BENCH / AIRCRAFT_LOCKED distinct in data, APIs, screens, logs and permissions.
3. Never connect a prototype to an aircraft, its installed cabin management/power systems or any emergency/egress lights. Flight integration demands OEM ICD, authorization, independent safety assessments, qualified hardware and airworthiness approvals.
4. Bench actuation only through an authenticated host gateway + validated deterministic MCU firmware + isolated protected current-limited laboratory driver + physical interlock. Never allow LLM, browser or cloud to directly address power outputs.
5. No false CMS/OEM compatibility, flight certification, telemetry, measurements or firmware/CI/deploy claims. Unsupported adapters stay disabled.
6. Adigun BOT only proposes editable scene drafts, requires schemas, previews, authorization and confirmation; all AI output untrusted.
7. Respect authentic corporate brand (#0B1220 navy, #D4AF37 gold, #22D3EE division cyan), one logo, no invented marks. Implement English, German, Yoruba, Nigerian Pidgin completely before claiming locale support.
8. Temporary UI panels float and never shift underlying canvas. Keyboard, touch and WCAG tests.
9. Preserve existing CNAME and unrelated changes. Work on branch/PR; no merge or deploy to main without authorization.
10. Every feature requires source, runnable demo, relevant tests, docs and honest source-of-truth device status.

## First functional vertical slice
Responsive branded nonblank simulator root, pure RGBW scene engine, interactive zone map, editable presets and timeline, import/export/local save, deterministic tests, Playwright browser flow.

## Required report
STATUS
- Done: verified changes
- Tested: actual passing/failing/not-run checks
- ESTIMATED FINISH TIME: hours/minutes if supportable, else unknown
- ETA: dated Europe/Berlin if supportable, else pending
- Next: one bounded action
