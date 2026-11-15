# Cabin lighting fixture simulation map

This map documents **visual simulation fixtures** added to the existing GLB renderer. It preserves the current studio panels and does not enable physical outputs. RGBW values are preview channels, not measured fixture commands or photometric data.

| Inspector group | Placement datum in the selected mesh | Preview behavior | Evidence status |
| --- | --- | --- | --- |
| Window daylight | Each named `Window glass` / `Window glazing` mesh; aimed source sits just inside the pane and points toward the nearby aisle/floor | Actual glazing changes with the selected RGBW group; soft downward spot spill reaches nearby seats and floor | Pane locations come from authored GLB geometry; no daylight photometry |
| Left / right sidewall | Named sidewall material groups and GLB punctual-light nodes | Independent side color/intensity and local light | Authored simulation coordinates, not a fitted fixture schedule |
| Handrail / bin edge | The aisle-facing lower lip of each named overhead-bin mesh; if bins are absent, the inboard top edge of named VVIP side consoles | Per-bin/per-console emissive strip plus sampled local spill | Derived from bin or console bounds |
| Ceiling / bin wash | Above the top surface of each named overhead-bin mesh; if bins are absent, upper sidewall near the modeled ceiling boundary | Per-bin strip and upward-aimed soft spot sources | Derived from bin bounds or modeled envelope |
| Central ceiling recess | Cabin centerline at the top of the modeled cabin envelope | Continuous linear cove and evenly spaced local sources | Centerline and recess are modeled assumptions |
| Reading lights | Above each named seat-headrest mesh; task spots aim down and slightly forward | Individual visible emitters; bounded set of physical preview spots for performance | Seat-relative position is estimated; supplied meshes have no PSU/call-panel components |
| Spotlights | Above each named galley/monument plus four evenly spaced positions derived from each modeled VVIP side-console run | Focused spotlights with local falloff aimed at the galley face or inboard console edge | Targets are derived from monument or console bounds |
| Emergency / escape path | Two low strips along the modeled aisle edges | Independent safety group, excluded from mood-scene interpolation | Simulated only; not a certified floor-path system |
| Exit signs | At the forward and aft ends of the modeled cabin envelope | Independent sign and local glow group, excluded from mood-scene interpolation | Estimated end cues; no exit/door objects or station metadata exist in the supplied GLBs |

## Source limits

The imported models provide useful geometric datums, including seat, window, sidewall, footwell, and bin meshes. They do not include service-panel hardware, reading-lamp assemblies, photometric files, or passenger-door/exit nodes. The per-model manifest labels the cabin surfaces and fixture positions as authored simulation geometry. Consequently, all new emitters remain simulation additions and must not be read as aircraft-installed hardware.

Published airport-planning documents can establish exterior door stations and aircraft planning dimensions, but they do not establish a specific airline interior fit or connect those stations to the local coordinate origin of these authored GLBs. For example, Airbus's A350 Aircraft Characteristics planning manual lists passenger doors and emergency exits, and Boeing's 777-200LR/-300ER manual provides main-entry-door stations. Those sources do not supply the missing cabin-fixture schedules or a mesh-origin transform for these assets:

- [Airbus A350 Aircraft Characteristics — Airport and Maintenance Planning, July 2025](https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2025-07/AC_A350_20250715.pdf)
- [Boeing 777-200LR/-300ER Airport Planning manual, D6-58329-2 Rev G, December 2024](https://www.boeing.com/content/dam/boeing/v2/airports/acaps/777-200LR-300ER-F_Rev_G.pdf)

For an aircraft-fit preview, add an operator-approved cabin layout with door/exit stations, PSU and fixture coordinates, fixture identity, RGBW or dimming behavior, and beam/photometric data. Until then, keep labels and exports explicit that the light sources are simulated and their positions are model-relative estimates.
