# Operator workflows available in this release

## Offline scene review

This workflow checks an exported scene file against the same schema used by the offline simulator. It does not approve a cabin fit or authorize hardware operation.

1. Export a scene JSON file from Cabin Studio.
2. From the repository root, run:

   ```sh
   npm run operator:validate-scene -- path/to/exported-scene.json
   ```

3. Review the JSON report. A `valid` result means the schema, time/keyframe bounds, zone targets, and RGBW channel ranges passed the shared scene validator. The report identifies `mode: SIMULATION`, `validationScope: SCHEMA_ONLY`, `hardwareConnected: false`, and `physicalOutputEnabled: false`.
4. Keep the original exported scene as the source artifact. Correct an invalid scene in Studio and export it again; the command never changes the file.

The command reads at most 64 KiB, rejects invalid UTF-8/JSON, and exits non-zero for usage, file, or scene validation errors. It sends no scene to the gateway or any device.

## Workflows not available

Role-based approval, operator accounts, audit sign-off, device discovery, bench prepare/commit, physical interlock checks, telemetry reconciliation, aircraft CMS control, and dispatch/crew workflows are not implemented. The locked Studio interface is unchanged, and the current gateway has no hardware command route. Do not interpret the scene preflight report as operator approval, bench verification, or OEM acceptance.
