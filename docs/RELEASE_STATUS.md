# AdigunCabinLighting release status

**Verified date:** 2026-11-13 (Europe/Berlin)

## Latest release

- **PR:** [#16 — Add simulation-only local gateway foundation](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/pull/16), merged.
- **Merge commit:** [`50214213e4a769a0265175e5f3a10917e65082c8`](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/commit/50214213e4a769a0265175e5f3a10917e65082c8).
- **CI:** workflow run [43368044191](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43368044191) passed lint, type checks, unit/integration tests, production build, and Chromium browser tests.
- **Post-merge CI:** run [43368627404](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43368627404) succeeded.
- **GitHub Pages:** deployment run [43368627448](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43368627448) succeeded for the merge commit.
- **Production smoke:** HTTPS HEAD checks returned 200 for [landing page](https://adiguncabinlighting.hephzibahbehulah.com/) and [Studio](https://adiguncabinlighting.hephzibahbehulah.com/studio/).
- **Interface boundary:** PR #16 changed no Studio source files. Its full browser suite passed in CI.

## What this release contains

PR #16 adds a separate Node service for deterministic local scene preview, bound only to `127.0.0.1`, protected by a minimum 32-byte bearer token, and explicitly reporting `SIMULATION` with physical output disabled. It has no hardware adapter, telemetry source, actuator route, or aircraft connection. `npm run gateway:start` starts it locally. GitHub Pages deploys only the static site and documentation; it does not host or run this Node service.

The Studio remains an offline visual simulator. Its approved layout, styling, navigation, panels, labels, and controls remain locked. The A350-900 planning profile is not an airline fit, OEM model, or certified digital twin; other cabin geometry remains illustrative.

## Next work and limits

The next release adds a traceable safety/security evidence ledger. A production gateway, board-specific firmware, bench/hardware testing, advisory AI runtime, OEM SDK, operator workflows, and reviewed localization remain incomplete. No physical output, OEM compatibility, certification, or airline approval is provided or claimed. See [ACTIVE_GOAL.md](ACTIVE_GOAL.md) for current roadmap status and [SAFETY_SECURITY_EVIDENCE.md](SAFETY_SECURITY_EVIDENCE.md) for evidence boundaries.
