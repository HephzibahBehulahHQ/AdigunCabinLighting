# Cabin lighting fixture simulation map

This map documents **visual simulation fixtures** added to the existing GLB renderer. It preserves the current studio panels and does not enable physical outputs. RGBW values are preview channels, not measured fixture commands or photometric data.

| Inspector group | Placement datum in the selected mesh | Preview behavior | Evidence status |
| --- | --- | --- | --- |
| Window daylight | Each named `Window glass` / `Window glazing` mesh; aimed source sits just inside the pane and points toward the nearby aisle/floor | Actual glazing changes with the selected RGBW group; soft downward spot spill reaches nearby seats and floor | Pane locations come from authored GLB geometry; no daylight photometry |
| Left / right sidewall | Named sidewall material groups and GLB punctual-light nodes | Independent side color/intensity and local light | Authored simulation coordinates, not a fitted fixture schedule |
| Handrail / bin edge | The aisle-facing lower lip of each named overhead-bin mesh; if bins are absent, the inboard top edge of named VVIP side consoles | Per-bin/per-console emissive strip plus sampled local spill | Derived from bin or console bounds |
| Ceiling / bin wash | Requires a sourced bin-top emitter or modeled attachment | Unavailable in the bundled profiles | No independent emitter anchors found |
| Central ceiling recess | Bounds of named ceiling-cove meshes | The authored emitter and a bounded row of samples add spill along the recess | Authored simulation geometry |
| Footwell | Bounds of named low-level footwell strips | Bounded local lights sit just above and inboard of the strips and illuminate nearby floor | Model-relative simulation spill, separate from emergency lighting |
| Service monuments / VIP consoles | Cabin-facing surfaces of named service units or VIP consoles | A local accent emitter and fill light preview each modeled surface | Derived from named mesh bounds |
| Reading lights | Requires an identified reading fixture or passenger service unit with seat association | Unavailable in the bundled profiles | No reading fixture or PSU anchors found |
| Spotlights | Requires an identified source and aim point | Unavailable in the bundled profiles | No authored spotlight anchors found |
| Emergency / escape path | Requires named fixtures or anchored floor-path data | Unavailable in the bundled profiles; separate from decorative scene values | No authored emergency anchors found |
| Exit signs | Requires identified exit positions mapped into the cabin | Unavailable in the bundled profiles; separate from decorative scene values | No matching exit station geometry or coordinate mapping found |

## Source limits

The imported models provide useful geometric datums, including seat, window, sidewall, footwell, and bin meshes. They do not include service-panel hardware, reading-lamp assemblies, photometric files, or passenger-door/exit nodes. The per-model manifest labels the cabin surfaces and fixture positions as authored simulation geometry. Consequently, all new emitters remain simulation additions and must not be read as aircraft-installed hardware.

Published airport-planning documents can establish exterior door stations and aircraft planning dimensions, but they do not establish a specific airline interior fit or connect those stations to the local coordinate origin of these authored GLBs. For example, Airbus's A350 Aircraft Characteristics planning manual lists passenger doors and emergency exits, and Boeing's 777-200LR/-300ER manual provides main-entry-door stations. Those sources do not supply the missing cabin-fixture schedules or a mesh-origin transform for these assets:

- [Airbus A350 Aircraft Characteristics — Airport and Maintenance Planning, July 2025](https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2025-07/AC_A350_20250715.pdf)
- [Boeing 777-200LR/-300ER Airport Planning manual, D6-58329-2 Rev G, December 2024](https://www.boeing.com/content/dam/boeing/v2/airports/acaps/777-200LR-300ER-F_Rev_G.pdf)

For an aircraft-fit preview, add an operator-approved cabin layout with door/exit stations, PSU and fixture coordinates, fixture identity, RGBW or dimming behavior, and beam/photometric data. Until then, keep labels and exports explicit that the light sources are simulated and their positions are model-relative estimates.

## Missing fixture placement audit

A scan of the 29 bundled GLBs (202,890 nodes) and the per-profile zone manifest found no named reading lamp or passenger-service-unit anchors, focused spotlight anchors, emergency-path fixture anchors, or passenger exit anchors for these four groups. Door-name matches were overhead-bin handles. The four unsupported groups remain unavailable in the bundled aircraft meshes.

The [Airbus A350 planning manual](https://aircraft.airbus.com/sites/g/files/jlcbta126/files/2025-07/AC_A350_20250715.pdf) records aircraft door positions. The bundled A350-900 GLB has no corresponding door anchors or verified mapping from the planning stations to its geometry. Those door positions cannot establish where exit signs or escape-path emitters belong in this model.

The comparison render test captures the supported decorative groups together at the Aurora and Sunset final keyframes in the A220-300 and A350-900. It checks that reading, spotlights, emergency, and exit options stay unavailable in both profiles.

## Verification on 21 November 2026

Rechecked all 29 bundled GLB files against the profile inventory. The audit resolved all 580 recorded mesh or locator sources to a node of the expected kind, and matched all 58 named footwell meshes across the portfolio. It does not establish installed aircraft fixture positions.

Local Chromium verified the G650ER isolated groups and final-keyframe mood renders, plus Aurora and Sunset in the A220-300 and A350-900. The G650ER footwell render shows spill on the nearby floor, seat bases, and lower walls. The review renders are under `artifacts/lighting-fixtures/`. Visual checks covered these three representative profiles. The all-model inventory check covered source nodes and component counts.
