# Approved Cabin Studio visual baseline

**Owner direction:** On 2026-11-13, the owner confirmed that the Cabin Studio interface is locked and must not be rearranged.

**Production baseline:** <https://adiguncabinlighting.hephzibahbehulah.com/studio/>  
**Release revision:** `962c7c2717f451f245b6e77647fe8ed8d080d01c`  
**Pages deployment:** [GitHub Pages run 43356997937](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43356997937)

## Fixed composition

- Top product header and compact simulation state
- Existing left navigation rail
- Central Cabin digital twin viewport
- Existing right zone inspector
- Docked Transition preview and Start with a mood panels at the bottom
- Existing viewport, 2D/3D, 4K, save, export and cabin-change controls

Future cabin profiles, dimensions and simulator capabilities must use these existing controls. Do not add a new screen, move panels, change their order or alter the viewport-constrained layout without a new owner request.

## Reference screenshots and coverage

The owner-supplied 3D cabin screenshot in this conversation is the visual reference for the cabin viewport. Automated screenshots from the deployed release candidate are retained in the `cabin-lighting-ui-screenshots` artifact attached to [CI run 43356510144](https://github.com/HephzibahBehulahHQ/AdigunCabinLighting/actions/runs/43356510144).

The UI suite covers desktop sizes 1280×720, 1366×768, 1440×900 and 1920×1080; mobile 390×844; no document overflow; accessibility; and docked-panel behavior. PR #13 changed cabin reference data and geometry within the existing viewport and selector; it made no CSS or layout-structure changes.
