# Active Goal — source-backed cabin reference profiles

**Pursuing now — `FORCE_REAL_AIRCRAFT_3D_IMPLEMENTATION_NOW`:** Continue extending the working Three.js cabin reference inside the existing Cabin Studio. Preserve the owner-locked single-screen layout. New cabin choices belong in the existing **Change cabin** control; do not rearrange the header, left rail, cabin viewport, inspector, timeline or scene library.

**Current implementation:** The viewport renders the configurable reference cabin and source-backed A350-900 two-class planning profile. That profile uses Airbus-published cabin length, maximum width, passenger seat totals and class pitches. It renders 315 seats using an explicitly derived row arrangement. Other cabin geometry such as cabin height, windows, bins, monuments and lighting fixture placement remains generic illustration. See [AIRCRAFT_REFERENCE_DATA.md](AIRCRAFT_REFERENCE_DATA.md).

**Aircraft identity gate:** The A350-900 option is a manufacturer-data reference, not an airline cabin fit, exact Airbus plan drawing, OEM model or certified digital twin. Keep all descriptions clear about derived geometry and source limits. Do not claim aircraft-specific compatibility, airline approval or certification without the exact approved model and configuration evidence.

**Safety:** This is an offline visual simulator. No aircraft or hardware output is connected or enabled. Hardware actuation, flight integration, certification and airline authorization remain out of scope until their independent engineering, authorization and safety gates are met.

**Verification:** PR #13 CI passed, including browser tests. The merged feature is at `962c7c2717f451f245b6e77647fe8ed8d080d01c`; GitHub Pages run 43356997937 deployed it successfully. Preserve the approved Studio layout baseline in [APPROVED_UI_BASELINE.md](APPROVED_UI_BASELINE.md).
