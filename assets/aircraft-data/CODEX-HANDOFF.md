# Codex handoff

Repository: HephzibahBehulahHQ/AdigunCabinLighting
Branch: assets/aircraft-dimension-data
Directory: assets/aircraft-data/

Fetch this branch and read catalog.json, aircraft-dimensions.json, airline-configurations.json, the per-aircraft scenario JSON files, and mesh-manifest.json. Load the 23 actual GLB files from meshes/ through catalog mesh_path entries. Run validate_data.py. There are 23 aircraft records and 138 lighting scenarios, plus 10 airline capacity references.

Use the sourced dimensions for aircraft selection and scale. Keep unknown fields null and obtain documented cabin cross-sections, floor widths, heights, window spacing, and seat maps before calling geometry manufacturer-accurate. Do not substitute exterior height for cabin height or apply A380 dimensions to the owner's executive-cabin photograph. Build actual detailed 3D meshes matching the supplied reference and selected aircraft. Keep authored geometry assumptions explicit.

Map the scenario keyframes to the scene engine's existing schema through a validated adapter. Four named zones are ceiling_cove, left_sidewall, right_sidewall, footwell. RGBW channels and master intensity are normalized 0..1. Physical fixture mapping is absent. Maintain truthful SIMULATION/OFFLINE status and the approved UI. Render and visually compare against the original image before claiming fidelity. The GLBs are authored simulation cabin geometry, with estimated details documented in mesh-manifest.json. Do not present them as exact OEM or airline-specific CAD. Their visual fidelity to the owner reference has not been verified.

Do not look for another session's /workspace/output files. Use this repository branch. Preserve unrelated localization/release work; work through a separate reviewed implementation PR.
