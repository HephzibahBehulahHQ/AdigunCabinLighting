# Active Goal — configurable 3D cabin lighting simulator

**Pursuing now — `FORCE_REAL_AIRCRAFT_3D_IMPLEMENTATION_NOW`:** Build and integrate an original, working 3D reference cabin in the existing Studio without changing its fixed layout. The central viewport is a Three.js WebGL scene with editable geometry, cabin seats, aisle, floor, curved ceiling, windows, sidewalls, bins, monuments and independent lighting zones. RGBW project values drive actual scene light sources and emissive fixtures. The existing 2D zone map remains available.

**Current implementation:** The 3D viewport supports camera look, aisle movement, wheel navigation, a left-rail camera reset, quality controls, and 3840 × 2160 PNG capture on capable devices. Reference dimensions, rows, seat pitch, seats per side, windows and bin depth are configurable from the left rail and saved with the local project. Existing local projects and scene editing remain in place.

**Aircraft identity gate:** This independently created geometry is labeled **CONFIGURABLE REFERENCE AIRCRAFT CABIN**. It is not an Airbus/Boeing model, airline cabin fit, OEM drawing, certified simulation or operator-approved configuration. Keep aircraft-specific selections disabled until the exact variant, authorized model rights and configuration evidence are verified. Never invent aircraft specifications or present this reference as a real aircraft digital twin.

**Safety:** The application is an offline visual simulator. No aircraft or hardware output is connected or enabled. Hardware actuation, flight integration, certification and airline authorization remain out of scope without their independent approvals and safety gates.

**Verification:** Typecheck, lint, production build, 11 unit tests and 11 Chromium end-to-end tests pass. Desktop viewport screenshots and mobile no-overflow checks are produced by the E2E suite. Three.js is lazy-loaded to keep the landing route lightweight; repeated seat geometry is instanced and idle rendering is event-driven.

