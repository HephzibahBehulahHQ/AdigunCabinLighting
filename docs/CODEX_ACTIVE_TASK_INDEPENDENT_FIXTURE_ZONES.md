# Active implementation handoff: cabin-specific independent lighting fixtures

**Status:** In progress. First implementation increment is local on `codex/independent-cabin-fixtures`; it has not yet been opened as a PR or deployed.
**Base:** Current `main`; prior handoff is PR #87. Confirm current branch/commit before implementation.
**Product constraint:** Preserve the approved Studio interface exactly.

## User goal

Make the existing aircraft cabin lighting simulator behave like a cabin-specific lighting editor. Each cabin profile must expose only the fixtures/components supported by that cabin’s model and source data. Users must be able to select an individual source on the existing 3D canvas and edit it in the existing Zone Inspector without changing other sources.

The goal is a traceable, cabin-layout-aware visual simulation—not a generic collection of glowing patches and not a claim of OEM-installed equipment when the source does not establish that. The public landing page also needs an interactive 3D cabin hero, user-selected mood palette, smooth light playback, and optional instrumental audio; improve public-page content without changing the locked Studio layout.

## Locked interface — binding

- Do not change the Studio layout, navigation/sidebar items, panel positions, viewport constraints, or existing Zone Inspector / Scene Library / Choreography structure.
- Put functionality in current canvas interactions and existing panels. No new sidebar item or replacement UI.
- Keep physical output disabled. This work is simulation only.

## Required fixture behavior

For each selected aircraft/cabin profile:

1. **Per-passenger controls:** Where source geometry/data supports them, create independently controllable lighting for each passenger position and side. A user must be able to set neighboring sources independently (for example, left sidewall light 1 red and light 2 green, right sidewall light 1 white and light 2 blue).
2. **Sidewall/window bays:** Address left and right sidewall lighting separately, and subdivide it to the actual modeled window/seat-bay or row layout when verified. Do not assume every profile has the same number or positions. Window daylight is a separate source/group and should originate at the modeled window panes.
3. **Ceiling:** Keep ceiling wash and recessed ceiling/cove sources distinct. Split the independently modeled cove meshes where appropriate.
4. **Passenger service / reading:** Model individual reading lights at the passenger service panel above the corresponding seat, near the call button, and aim each at the associated passenger reading area—but only when the selected cabin’s mesh or profile/source data establishes those fixture positions. The user wants separate reading and passenger-call components, not a single generic cabin light.
5. **Other mapped groups:** Preserve and distinguish existing modeled groups such as handrail/bin-edge lighting, focused spotlights, emergency/escape-path lighting, and exit signs. Emergency and exit functions must not be merged into decorative mood scenes.
6. **Independent controls:** Select each supported source directly in the mockup; expose its own RGBW color and intensity (and supported effect) in the existing inspector. Editing one source must not modify adjacent sources.
7. **Cabin-specific inventory:** Switching cabin/aircraft must immediately filter the existing Inspector to only that profile’s supported fixtures. If selection is absent on the new profile, choose a valid supported source. Unsupported zones must not appear.
8. **Scenes/playback:** Existing moods and choreography should animate fixture values with smooth fades. Preserve per-source values across keyframes, playback, save/load, project switching, export and legacy project migration. A group scene may initialize child fixtures, but subsequent individual edits must stay independent.
9. **Adaptive count:** Fixture/zone counts and positions must derive from each profile’s actual model geometry, seat/bay/row layout, aircraft length and available cabin data. Do not hard-code five lights per side or repeat a generic arrangement across aircraft.
10. **Evidence/labels:** Distinguish named model mesh, authored locator/anchor, derived visual-simulation source, manufacturer planning data and airline-installed fit. Never describe an empty locator as a physical lamp or illustrative geometry as an airline/OEM cabin fit. Show missing source evidence as missing.

## Asset audit (29 bundled GLBs)

Catalogs: `assets/aircraft-data/catalog.json`, `assets/aircraft-data/airline-mesh-catalog.json`; generated profile inventory: `assets/aircraft-data/generate_zone_availability.py`.

Verified audit findings:

- All 29 GLBs have two named `Ceiling cove` mesh components.
- All 29 have one named left and one named right sidewall light-strip mesh.
- All 29 have eight named sidewall locator nodes per side. They have transforms but no mesh; these are authored anchors, not visible fixtures. The same count appears on a five-row G650 and 56/57-row widebodies, so the locator count alone is not a row-adaptive inventory.
- A node-name scan found no named reading lights, passenger service units, call buttons, or attendant-call buttons. Do not present a reading control as modeled PSU hardware.
- Naming varies across model families: dimension meshes use names such as `Seat row N position M ...`; airline meshes use names such as `Emirates first seat 1A ...`. Parse the actual manifests/catalogs and geometry rather than assuming one naming convention.
- Current assets include authored simulation geometry and estimated cabin proportions; they are not evidence of OEM CAD or an airline’s installed cabin fit.

Useful row/seat audit samples: G650ER 5 rows / 10 seats; A330-900 57 / 456; A380 56 / 560; A220-100 24 / 120; Emirates 777-300ER 328-seat layout 43 rows. Validate values against the manifests before using them in code.

## Implementation guidance

- Read `docs/CODEX_ACTIVE_TASK_INDEPENDENT_FIXTURE_ZONES.md` (this file), `CODEX-HANDOFF.md`, `assets/aircraft-data/catalog.json`, `assets/aircraft-data/airline-mesh-catalog.json`, each relevant mesh manifest, and existing Zone Inspector / renderer code.
- Key source areas identified: `src/scene-engine.ts` (static zone IDs, scenes/interpolation/validation), `src/aircraft-assets.ts` (profile zones), `src/App.tsx` (selected profile, inspector options, playback/persistence), `src/CabinAsset3D.tsx` (GLTF traversal, picking, fixture visuals and lighting).
- Existing transforms may be nested; update world matrices before reading fixture world positions.
- Implement incrementally, starting with independently addressable cove and supported sidewall/window geometry. Keep existing groups and old scene/project imports compatible.
- Research manufacturer cabin drawings and airline cabin/seat documentation for reading/PSU/call details. A seat map or aircraft exterior dimensions do not prove PSU hardware or exact fixture placement. Where documentation and mesh evidence remain absent, continue supported work and record the precise gap; never fabricate an authentic fixture position.
- Treat locator-derived or seat-position-derived points as estimated simulation sources, explicitly labeled and justified, not physical light hardware.
- Keep software dependencies, shader/light counts and viewport performance within practical browser limits.

## Required verification and review

- Audit all 29 GLBs and verify every Inspector option resolves to a named mesh, documented locator, or explicitly labeled derived simulation source.
- Verify cabin-specific filtering, fallback selection, per-fixture isolation, canvas picking/highlight, color and intensity, smooth transitions/playback, keyframe/save/load/export compatibility, undo/redo and legacy project migration.
- Test profiles from VVIP, regional/narrowbody, widebody and airline-specific layouts; verify counts/placement follow real mesh/layout data rather than one generic recipe.
- Inspect rendered previews for source visibility, correct side/seat/window alignment, meaningful surface illumination, overlapping/missing geometry, renderer errors and comparison to the user’s VVIP reference.
- Capture reviewer-accessible screenshots or a working preview. A passing validator/CI run alone is not visual acceptance.
- Compare screenshots/panel bounds with the locked Studio baseline; any visible layout change is a regression.
- Run focused tests, lint, typecheck, build and Playwright where available. Report unavailable local tooling accurately; use CI evidence where local environment cannot run the suite.
- Publish small, verified implementation increments. Merge after checks, then verify deployment and the live rendered result. Do not claim deployment based only on a merge.

## Immediate next actions

1. Publish the current implementation commit on top of latest `main`, open a progressive PR, wait for CI, then merge and verify Pages/live landing and Studio.
2. Continue the cabin-by-cabin visual audit across all 29 profiles; current tests exercise profile-specific source inventory and a rendered G650 sidewall selection. Do not claim all 29 previews have been visually reviewed yet.
3. Investigate missing PSU/reading/call-button source evidence; do not expose unsupported hardware as modeled fixtures.
4. Run the remaining browser suite and capture separate source-class and combined-scene previews. Fix any visual errors found.
5. Measure 16K video capability after defining its output contract; no 16K video control exists until render, encode, memory and device checks pass.

## Landing-page progress

- The public hero now loads the bundled G650ER cabin GLB using the existing 3D renderer, supports scene palette selection, animated timeline preview and user-initiated mood instrumental audio.
- The page explains the profile → modeled light source → preview/save workflow and reports the 29 bundled mesh profiles.
- Chromium has verified landing GLB load, palette selection, transition play/pause, and audio opt-in. The screenshot is `test-results/landing-live-3d-preview.png` in the worktree.
- The landing preview is labeled HD simulation. 16K video remains a feasibility task; do not claim 16K capability from the current viewer.
- Follow-up visual review moved the idle preview to the finished keyframe of its selected mood (so its palette is visible immediately) while Preview still runs the complete transition. The landing palette now samples ceiling, sidewall, window and footwell colors for six moods.
- A local Chromium/SwiftShader probe reported an 8192 × 8192 max viewport, texture and renderbuffer, against a 15360 × 8640 (16K UHD) target; one RGBA frame requires 530,841,600 bytes (~506 MiB) before depth, multi-buffering or encoding. This host therefore cannot validate 16K; actual device and video-export benchmarking is still required.
- Follow-up visual review moved the idle preview to the finished keyframe of its selected mood (so its palette is visible immediately) while Preview still runs the complete transition. The landing palette now samples ceiling, sidewall, window and footwell colors for six moods.
- A local Chromium/SwiftShader probe reported an 8192 × 8192 max viewport, texture and renderbuffer, against a 15360 × 8640 (16K UHD) target; one RGBA frame requires 530,841,600 bytes (~506 MiB) before depth, multi-buffering or encoding. This host therefore cannot validate 16K; actual device and video-export benchmarking is still required.

## Additional user request: 16K cabin video

The user has added a request to render cabin profiles as 16K video and place the video action in the existing top viewer control cluster beside the 2D / 3D / HQ 4K controls. Treat this as an explicitly requested control addition at that location, while keeping the rest of the approved interface, panel positions, and navigation unchanged.

Before offering a 16K option or claiming support:

- Define and document the exact output dimensions, frame rate, codec/container, color handling, duration limits, and whether 16K means 15360 × 8640 or another explicitly selected format.
- Benchmark representative small, narrowbody, widebody and airline GLBs for memory use, render time, thermal/performance constraints, cancellation, and file size. Browser WebGL viewport limits mean a 16K render may require tiled/offscreen rendering; prove it works before exposing it as a working export.
- Generate actual video frames from the selected loaded cabin and its animated lighting tracks, not a still image renamed as video or a placeholder.
- Keep 2D/3D/HQ 4K controls working. The video control must preserve scene/profile selection and render the selected cabin only.
- Add user-visible completion, failure, and progress behavior inside the existing export/control surface without moving the locked layout.

“Real cabin” and “international standard” must be tied to a stated aircraft variant, airline/cabin-fit source, asset license, and source revision. A 16K output resolution increases pixel count; it does not make estimated geometry or unsupported fixture positions authentic. Do not label illustrative assets as an airline/OEM fit or claim generic international-standard compliance. Record precisely which profiles and details have verified source data versus remaining estimates.

Include 16K export in the visual QA and compatibility checklist. This request does not authorize hardware output; all rendering and lighting remain simulation-only.
