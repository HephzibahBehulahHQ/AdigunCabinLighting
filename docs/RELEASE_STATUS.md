# AdigunCabinLighting release status

**Verified date:** 2026-11-13 (Europe/Berlin)
**Production release:** PR #15 is merged at `588c4dd426464d1e9a0e3a95114670dc7c2738f6`; its CI and GitHub Pages deployment succeeded. Production smoke checks previously returned HTTP 200 for the landing page, Studio page, main JavaScript, and lazy 3D asset. This is the deployed baseline; the local gateway work below is not yet released.

## Studio interface lock

The owner-approved Cabin Studio layout and interactions remain locked. See [APPROVED_UI_BASELINE.md](APPROVED_UI_BASELINE.md). The current roadmap adds separate services, documentation, and verification; it must not change Studio layout, styles, navigation, panels, or controls.

## Current gateway increment — not released

A local simulation-only Node gateway has been implemented in the working branch. It binds to loopback, requires a 32-byte minimum bearer token, validates scene previews with the existing scene engine, and explicitly returns `physicalOutputEnabled: false`. It has no hardware adapter or actuator route. Local lint, frontend and gateway type checking, and gateway compilation pass. The HTTP integration suite could not bind localhost in the restricted development environment (`EACCES`); CI must run it before merge. No deployment or production availability is claimed for this increment.

## Existing aircraft-reference limits

The A350-900 planning profile uses cited manufacturer dimensions and class seat totals to derive a reference arrangement. It is not an airline cabin fit, OEM model, or certified digital twin. Other cabin geometry remains illustrative. No hardware output, OEM compatibility, certification, or airline approval is claimed.

## Verification evidence

- Deployed baseline: PR #15 merge `588c4dd426464d1e9a0e3a95114670dc7c2738f6`; workflow and Pages success recorded in the preceding release evidence.
- Current local gateway: `npm run lint`, `npm run typecheck`, and `npm run build:gateway` passed after adding Node lint globals and excluding generated output.
- Current gateway HTTP integration tests: not verified locally because loopback bind was denied; CI result required.
- Current gateway production deployment: none.
