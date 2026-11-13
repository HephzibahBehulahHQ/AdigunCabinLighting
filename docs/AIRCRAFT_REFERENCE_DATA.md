# Aircraft reference data in Cabin Studio

## Airbus A350-900 standard reference

The **A350-900 · standard reference** choice uses only manufacturer-published reference values for the cabin envelope and standard two-class seat totals:

- Cabin length: 51.04 m
- Maximum cabin width: 5.71 m
- Standard two-class plan: 315 passenger seats (48 business, 267 economy)
- Business: 6 abreast at 60 in pitch (1.524 m)
- Economy: 9 abreast at 32 in pitch (0.8128 m)
- Standard plan also lists 8 attendant seats, 12 galleys, 9 lavatories and 1 stowage

Sources: [Airbus A350-900 key figures](https://www.aircraft.airbus.com/en/aircraft/a350/a350-900) and [Airbus A350 Aircraft Characteristics — Airport and Maintenance Planning, section 2-4-0](https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2025-07/AC_A350_20250715.pdf).

## What the viewport represents

The profile uses a generated Three.js cabin. Its published length, maximum width, passenger counts, class groupings and class seat pitches are source-backed. To render all 315 seats in this viewport, rows are derived from those totals: 8 business rows of 6, 29 economy rows of 9, and one partial economy row of 6. **That row distribution and the order of the class sections are rendering choices, not the Airbus plan drawing.** The ceiling height, window count, bin depth, monuments, fixture locations and remaining cabin geometry are generic visual references, not A350-specific data. The result is not an airline cabin fit, OEM-authorized model, engineering installation drawing or certified digital twin.

The source-backed dimensions and row-plan controls are locked while this profile is selected. Users can still edit the generic geometry fields; those remain explicitly identified as illustrative. Selecting any generic profile returns its editable dimensions.

No Airbus CAD, proprietary 3D model or cabin plan image is embedded. The published measurements and seat totals support a planning reference only; airline-specific cabin configuration and fixture placement require operator-approved drawings and asset rights.
