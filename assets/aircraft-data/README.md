# Aircraft reference and simulation data

23 aircraft dimension records, 10 airline capacity configurations across Qantas/QantasLink, Emirates and British Airways, and 138 authored RGBW scenarios. Includes 23 self-contained GLB cabin meshes plus JSON reference data.

Start with `catalog.json`. `aircraft/` stores individual aircraft records; `scenarios/` stores six presets for each aircraft: boarding, aurora, sunrise, sunset, dining and sleep. `aircraft-dimensions.json` aggregates the dimensions. Each aircraft and airline record includes its source URL.

Published dimensional measurements retain source precision. Null means not established by the sources reviewed. Exterior height is never substituted for cabin height. Maximum cabin width is not necessarily floor width. Boeing cabin measurements not established by the referenced product tables remain null. Airline capacity variants are separate records; an upper bound is labeled explicitly. The meshes contain actual geometry, materials, cameras, and punctual lights. They are dimension-based authored simulations, not OEM CAD. `mesh-manifest.json` records all modeled dimensions and assumptions. A380 mesh scope is its main-deck cabin. Airline-specific seat maps are not implemented by these generic aircraft meshes. The reference photograph has not been assigned an aircraft identity.

Lighting settings are authored simulation targets, not actual manufacturer or airline lighting programs. Fixture mapping remains null. No firmware, hardware connection, aircraft compatibility, photometric accuracy, or flight approval is implied.

Run `python assets/aircraft-data/validate_data.py` from the repository root to check IDs, dimensions, references, capacities, channels and keyframe times.

## Mesh generation and verification

`node assets/aircraft-data/build_models.js` regenerates all 23 GLBs without third-party dependencies. `python assets/aircraft-data/validate_meshes.py` checks GLB structure, accessor bounds, triangle indices, and node references. Visual fidelity and app integration require renderer review; neither is claimed by the binary checks.

## Airline-specific meshes

Six separate models and their complete seat-placement JSON are indexed by `airline-mesh-catalog.json`: Emirates 777-300ER layouts extracted from three official SVG charts (360, 328, 419 actual seat symbols); British Airways 777-300ER 256 seats (rows and seat IDs transcribed from its official chart); Qantas 787-9 236 seats; QantasLink A220-300 137 seats. The two Qantas meshes reproduce published class counts and abreast patterns, but partial rows and exact seat identities remain authored SIM slots. They must not be advertised as exact seat-map reconstructions.

The chart-specific Emirates counts differ from older fleet-summary capacity options; the two datasets describe different published references and are not silently reconciled. SVG seat positions are relative diagram coordinates; metric scaling is authored. These meshes are not verified OEM component shapes or an exact recreation of the owner's photograph.

`node assets/aircraft-data/build_airline_models.js` reproduces the airline GLBs. `python assets/aircraft-data/validate_airline_geometry.py` checks aggregate seat AABBs against other seats and component AABBs against the modeled curved upper sidewalls and lower lining. The saved report records zero conflicts in those checks for all six models. This does not prove absence of every triangle intersection, photorealism, exact aircraft fit, or egress compliance. Visual review in the actual renderer is still required.
