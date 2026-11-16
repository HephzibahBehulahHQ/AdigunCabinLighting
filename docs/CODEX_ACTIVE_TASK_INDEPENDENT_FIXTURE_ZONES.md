# Active implementation handoff: cabin-specific independent lighting fixtures

**Status:** In progress. The repository contains an asset audit and this implementation plan; the requested per-fixture controls are not yet implemented. The next agent should continue from this document and the current Studio code, not restart the project.
**Base:** Current `main`; prior handoff is PR #87. Confirm current branch/commit before implementation.
**Product constraint:** Preserve the approved Studio interface exactly.

## User goal

Make the existing aircraft cabin lighting simulator behave like a cabin-specific lighting editor. Each cabin profile must expose only the fixtures/components supported by that cabin’s model and source data. Users must be able to select an individual source on the existing 3D canvas and edit it in the existing Zone Inspector without changing other sources.

The goal is a traceable, cabin-layout-aware visual simulation—not a generic collection of glowing patches and not a claim of OEM-installed equipment when the source does not establish that.

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

1. Inspect the current branch/main and relevant renderer, scene-engine, profile inventory and tests.
2. Build a data-backed per-profile fixture inventory from the GLBs/manifests, including actual seat/row/bay identities; do not expose unsupported PSU/reading/call options as modeled hardware.
3. Implement and verify independent controls for the first supported geometry classes inside the locked canvas/Inspector.
4. Continue cabin-by-cabin until all 29 profiles are audited and their supported fixtures are represented; document each actual evidence gap without stopping unrelated work.
5. Capture and review the actual rendered previews; fix geometry/rendering issues before calling the simulator complete.
