# Cabin reference data and geometry limits

This document separates manufacturer planning data from values and shapes derived for the Studio's generic reference viewer. A profile in the existing **Change cabin** selector is not an OEM CAD model, airline cabin fit, certified digital twin, or aircraft connection.

## Manufacturer planning references

| Profile | Source facts used | Source |
|---|---|---|
| A330-300 | Cabin length 50.36 m; maximum cabin width 5.26 m; 300-seat two-class planning example; 36 business and 264 economy seats; planning pitches of 60 in and 32 in | [Airbus A330-300 aircraft characteristics](https://www.aircraft.airbus.com/en/aircraft/a330/a330-300); [A330 Aircraft Characteristics, November 2024 revision](https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2024-11/AC_A330_1124.pdf) |
| A350-900 | Cabin length 51.04 m; maximum cabin width 5.71 m; 315-seat standard two-class example; published class totals and planning pitches | [Airbus A350-900 aircraft characteristics](https://www.aircraft.airbus.com/en/aircraft/a350/a350-900); [A350-900/-1000 Aircraft Characteristics](https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2023-02/Airbus-Commercial-Aircraft-AC-A350-900-1000.pdf) |

Manufacturer seat totals describe planning examples, not the selected airline's configuration. The references do not identify an operator-specific installed cabin for this application.

## Derived and illustrative content

- Seat rows are generated from class totals, seat groups and planning pitch. The row order, count of rows and exact longitudinal placement in the viewer are derived for visualization; they are not copied from an Airbus cabin layout drawing.
- The A330-300 example is rendered as six rows of 2-2-2 business and 33 rows of 2-4-2 economy to preserve the cited totals and pitch. The A350-900 example remains its existing derived arrangement.
- Ceiling height, window count and location, window shape, bins, monuments, wall panels, lavatory fittings, fixtures, and light response are generic procedural reference geometry. The supplied cabin and lavatory images guide appearance only; they do not establish dimensions, OEM provenance, material specifications, or fit.
- The lavatory vanity, mirror, tap, basin, and toilet added to the 3D view are visual primitives. They do not reproduce approved sanitary equipment or a particular aircraft's lavatory.
- No licensed or manufacturer cabin interior mesh has been integrated. Current 3D geometry is generated in code and remains an illustrative model even when a profile uses sourced planning dimensions.

## Interface boundary

The profile uses the existing Change cabin selector and detail panel. This increment does not change Studio layout, styling, navigation, controls, or panel geometry. Only the selected profile's source description and values change.
