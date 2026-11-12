# AdigunCabinLighting

**Hephzibah Behulah · HB Elektroniker**

AdigunCabinLighting is production-oriented cabin lighting design software, beginning with an offline RGBW simulator. It is intended for an airline engineering context; real device control is not part of this first software release.

## Current implementation

- / is the public product entry page.
- /studio is the responsive Cabin Studio with an interactive, illustrative 2D cabin zone map, independent RGBW values, master intensity, editable fades, six editable scene definitions, deterministic timeline interpolation/playback, keyframes, undo/redo, local browser persistence, and validated versioned JSON import/export.
- The app defaults to SIMULATION · OFFLINE · NO HARDWARE CONNECTED. No physical I/O, gateway, hardware telemetry, Adigun BOT runtime, OEM adapter, aircraft connection, or certification claim is present.
- Local drafts use browser localStorage on the current browser profile. Export scene files for backup or transfer.

The cabin drawing is an illustrative zone model, not an aircraft layout fit, lighting performance calculation, or physical irradiance model. Engineering validation for any specific aircraft, fixture, or controller remains out of scope.

## Run locally

Requires Node.js 22 or newer.

    npm ci
    npm run dev

Open the local URL printed by Vite. The simulator itself makes no server or hardware connection.

## Verify

    npm run lint
    npm run typecheck
    npm run test
    npm run build
    npx playwright install chromium
    npm run test:e2e

## Release

The owner-approved first release is limited to the product entry page plus the functional offline Studio. The build emits a direct `/studio/` route, preserves the custom domain in `CNAME`, and provides a `404.html` SPA fallback. The deployment workflow publishes those static files to GitHub Pages. The public domain is not considered deployed until its URL and Studio interactions have been checked after the workflow succeeds.

Read AGENTS.md, docs/ACTIVE_GOAL.md, docs/UI_FIRST_RELEASE_GATE.md, and docs/CODEX_MASTER_PROMPT.md before making product changes.
