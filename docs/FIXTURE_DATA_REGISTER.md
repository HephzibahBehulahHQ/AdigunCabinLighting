# Cabin fixture evidence register

The operator preflight now reports fixture-data coverage with every valid scene review. The report checks scene schema and channel ranges, then separately identifies whether physical fixture evidence exists. Missing evidence does not prevent offline review, but it prevents treating the render or RGBW values as a measured aircraft-cabin lighting result.

## Current status

All 11 Studio zones are associated with a named **procedural reference geometry** group: ceiling, windows, sidewalls, footwell, reading, entry, monuments, lavatory, handrail, trolley, and cabin ambient. This is a mapping to generated viewer elements only.

For every zone, the register explicitly records:

- Fixture part number and installed configuration: **MISSING**
- Aircraft-fit coordinates and orientation: **MISSING**
- Fixture RGBW electrical/channel behavior: **MISSING**
- Photometry, beam distribution, and output calibration: **MISSING**
- Approved cabin drawing or fixture-source document: **MISSING**

The four channels in a scene are software values normalized from 0 to 100. They specify the simulator's RGBW input; they do not prove that any real fixture supports those channels or that its optical output matches the visual preview.

## What is needed to close the gaps

For a specific approved cabin fit, the register needs controlled cabin/monument drawings, fixture manufacturer and part numbers, install coordinates and orientations, driver/ICD channel definitions, rated channel limits, photometric files or measured distributions, surface/material information for any lighting estimate, and document revisions with permission to use. Each claim must link to that evidence. A supplied reference image is visual guidance and does not establish these engineering facts.

Until those sources are attached and reviewed, scene preflight reports `MISSING_FIXTURE_DOCUMENTATION` and names every uncovered zone. It continues to state `SIMULATION`, `hardwareConnected: false`, and `physicalOutputEnabled: false`.
