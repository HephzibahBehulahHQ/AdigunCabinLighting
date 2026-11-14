# Operator workflows available in this release

## Studio mood soundtrack, welcome announcement, and tour

Inside **Choreography → Transition preview**, the **Music** control enables a scene-specific instrumental accompaniment. The score is synthesized locally with Web Audio and follows the selected scene timeline; the included moods have distinct tempo, harmony, motif, and instrument timbre. **Audio** opens the playback-volume slider, a generated-voice welcome announcement, and a spoken cabin tour. The welcome includes a short four-note chime. Browser speech voices and audio output vary by device; the voice preview requires a user click and can be stopped by starting another utterance or leaving the Studio.

These are design-preview sounds, not licensed recordings, a cabin PA integration, an airline-approved announcement, or evidence of acoustic performance in an aircraft. “HB380” is spoken as the requested product/cabin concept name; the viewer still labels its geometry as illustrative, and no A380 aircraft fit is established. Generated instrumental audio is rendered locally and is not sent to the gateway or hardware. The app does not transmit announcement text to the gateway; the selected speech voice is provided by the browser/operating system and its network behavior depends on that platform. The volume slider controls both instrumental and spoken previews; the **Music** control can mute the score independently.

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

## Studio export engineering preflight

Use **More studio actions → Export engineering preflight · JSON** to download the selected scene with a schema/channel-range result, selected cabin dimensions and source/rights status, field-level cabin provenance, fixture evidence by zone, and a scene comparison when a matching built-in preset baseline exists. Report version 2 marks manufacturer planning values, viewer-derived row counts, illustrative geometry, and user edits separately. Fixture identity, installation coordinates, photometric data, and source remain explicitly missing for the current procedural zones. Custom scene IDs without a supplied baseline are reported as `NO_BASELINE`. The report records the scene data and `physicalOutputEnabled: false`; it validates simulator data and evidence coverage only, not an aircraft fit, hardware, fixture photometry, or operating approval.

## Offline scene revision comparison

Compare a baseline export with a proposed export before replacing or sharing the baseline:

```sh
npm run operator:diff-scenes -- path/to/baseline-scene.json path/to/proposed-scene.json
```

The command validates both files with the shared scene validator and prints a deterministic JSON report of metadata, keyframe-time, zone, RGBW channel, and easing changes. Each target/easing change includes its baseline and proposed value. An `unchanged` report means the supported schema fields match; `changes-found` requires a human review of the listed changes.

The reader caps each file at 64 KiB and rejects invalid UTF-8/JSON. The tool never modifies either input. It compares explicit keyframe data; it does not calculate an interpolated time-series, check an aircraft fit, or authorize a release. The report is simulation-only, with physical output disabled.

## Offline scene integrity receipt

Create a deterministic receipt for the exact bytes of one exported scene:

```sh
npm run operator:receipt-scene -- path/to/exported-scene.json
```

The command reads the file through the same 64 KiB bounded reader, validates it with the simulator schema, and reports its exact byte length and SHA-256 digest. Whitespace and line-ending changes produce a different digest. Keep the original file with the receipt when passing a scene between reviewers.

The receipt is an integrity fingerprint and schema result only. It does not identify an operator, record an approval, contain a signature, or provide an immutable audit log. It does not validate aircraft fit, OEM limits, electrical safety, or hardware behavior. No gateway/device command is sent and physical output remains disabled.

## Offline scenario package

Create a request file, for example:

```json
{
  "schemaVersion": 1,
  "packageType": "adigun-cabin-scenario-request",
  "projectName": "A330 lighting review",
  "cabinLayoutId": "a330300",
  "activeSceneId": "boarding",
  "sceneFiles": ["./boarding.json", "./sleep.json"],
  "outputPath": "./review-package.json",
  "masterIntensity": 72
}
```

Then run:

```sh
npm run operator:pack-scenario -- path/to/scenario-request.json
npm run operator:review-scenario -- path/to/review-package.json
```

Scene and output paths in the request are resolved relative to that request file. The package records the layout ID, cabin dimensions, source URL and evidence status for the selected profile; it also stores the zones, scenes, active scene, master intensity, and explicit simulation-only/no-physical-output state. Profile evidence is derived from the checked-in registry; edited source-backed dimensions are marked as a user-adjusted reference. Every scene is checked by the Studio's shared schema. The active scene must be included, IDs must be unique, and channel/duration limits are enforced.

The output path is created only if it does not already exist. The package and each source scene are bounded to 64 KiB. The review report includes current fixture-documentation coverage, which remains missing for the simulator zones. Cabin geometry remains illustrative or planning-reference data, not an airline fit. The package is not digitally signed, is not imported into browser-local Studio storage, does not record an operator identity or approval, and cannot send hardware commands.

## Workflows not available

Role-based approval, operator accounts, audit sign-off, device discovery, bench prepare/commit, physical interlock checks, telemetry reconciliation, aircraft CMS control, and dispatch/crew workflows are not implemented. Scenario packages are offline artifacts and are not imported into the locked Studio. The current gateway has no hardware command route. Do not interpret any review report as operator approval, bench verification, or OEM acceptance.


