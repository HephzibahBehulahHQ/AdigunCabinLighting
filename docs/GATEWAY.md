# Local simulator gateway

## Scope

This is a local, deterministic scene-preview service for development and integration work. It is **simulation only**. The current implementation has no hardware adapter, telemetry source, actuator endpoint, aircraft connection, or physical output. Do not use it to control an aircraft or bench hardware.

The service binds only to `127.0.0.1`, requires `ADIGUN_GATEWAY_TOKEN` with at least 32 UTF-8 bytes, and rejects non-loopback `Host` values. Keep the token local and out of logs, source control, browser bundles, and support reports. The API is not exposed to the Studio frontend.

## Start

Requires Node.js 22 or newer.

```powershell
$env:ADIGUN_GATEWAY_TOKEN = '<locally generated random secret of at least 32 bytes>'
npm run gateway:start
```

The service defaults to port `4510`. Set `ADIGUN_GATEWAY_PORT` to another available local port if needed. The startup message identifies simulation mode and confirms that no hardware output is enabled. The token is never printed.

## Routes

All routes require `Authorization: Bearer <token>` and accept only loopback `Host` values.

| Method and path | Behavior |
| --- | --- |
| `GET /v1/health` | Returns readiness and explicit `mode: SIMULATION`, `hardwareConnected: false`, and `physicalOutputEnabled: false`. |
| `GET /v1/capabilities` | Reports the simulator adapter, RGBW channels, scene preview capability, and no physical output or telemetry. |
| `POST /v1/preview` | Validates a versioned scene file using the shared scene engine and returns deterministic interpolated zone targets at `timeSeconds`. |

Preview body:

```json
{
  "scene": {
    "schemaVersion": 1,
    "id": "preview",
    "name": "Preview",
    "durationSeconds": 60,
    "keyframes": [{
      "atSeconds": 60,
      "targets": { "ceiling": { "r": 20, "g": 10, "b": 30, "w": 0 } }
    }]
  },
  "timeSeconds": 12
}
```

Use an exported scene file so that its schema and zone targets match the shared validator. Invalid scenes and times return structured errors. Request bodies are capped at 64 KiB. The HTTP server also caps headers at 64, applies 10-second header, 15-second request, and 5-second keep-alive timeouts, and limits simultaneous connections to 64. The API does not provide a command to apply targets to any device.

## Verification and readiness boundary

`npm run lint`, `npm run typecheck`, and `npm run build:gateway` validate the current local increment. `npm test` includes gateway HTTP integration tests, but those tests require loopback sockets; run them in CI where local socket binding is permitted. Do not call this gateway hardware-ready, bench-ready, production-hardened, or safety-validated. Those states require separate reviewed milestones and evidence.
