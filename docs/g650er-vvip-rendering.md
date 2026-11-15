# G650ER VVIP cabin rendering notes

## Published envelope

The selected profile uses Gulfstream's February 2022 G650ER product sheet for a 14.27 m cabin length excluding baggage, 2.49 m finished width, 1.91 m finished height, and 16 panoramic oval windows: [G650ER product sheet](https://assets.gulfstream.aero/downloads/22_464552_G650ER_Product_Sheet_PROD_DAM.pdf).

The included GLB contains 10 authored seats in five two-seat rows, matching the supplied VVIP reference's paired-seat and centered-aisle composition. This seat count and row pattern come from the mesh, not a published Gulfstream seat plan. Seat sizes, pitch, monument positions, materials, and lighting fixtures remain authored estimates.

## Geometry corrections and review

- The GLB authored 18 window positions per side. The renderer keeps eight symmetric positions per side (indices 1, 3, 5, 7, 10, 12, 14, 16) to match the manufacturer's total of 16. Window spacing and exact longitudinal positions are not claimed as measured.
- The 20 non-profiled window positions have their authored frames and glazing hidden. Disconnected sidewall-bay faces are replaced with smooth inner wall panels whose oval openings follow the 16 retained glass bounds. Panel dimensions are modeled estimates, not an OEM cross-section.
- The supplied GLB has no ceiling shell. The renderer adds a curved interior ceiling surface inside the published cabin envelope; its cross-section and material are modeled estimates, not an OEM cross-section.
- Seat component envelopes began 25 mm above the carpet. The renderer lowers those mesh-authored seat components by 25 mm so the pedestals meet the carpet datum.
- A Three.js bounds review grouped 240 seat component meshes into 10 seat envelopes. After the floor correction, no pair of seat envelopes overlaps and the measured floor gap is 0 m. This bounds check does not test all part-to-part collisions or establish an OEM fit.
- The lining uses a warm ivory render material to better match the owner's VVIP reference. Material response and RGBW output are visual simulation; no photometric or physical fixture data is supplied.

The 2D plan and 3D mesh share the same sourced envelope, five-row/two-seat arrangement, and 8-window-per-side count. Neither is an approved Gulfstream interior drawing or a measured airline configuration.

