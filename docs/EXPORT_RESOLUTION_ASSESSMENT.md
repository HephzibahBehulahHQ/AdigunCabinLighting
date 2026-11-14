# Cabin export resolution assessment

The existing export control produces a 4K image for the 3D view and an HD or 4K image for the 2D view. This increment measures the current 3D render-plus-encode duration on the user's device and checks the WebGL renderbuffer limit and the actual allocated drawing buffer before starting capture.

The notice reports only one RGBA8 surface's lower-bound storage: 3840 × 2160 uses 31.6 MiB; 15360 × 8640 (16K UHD) uses 506.3 MiB; 23040 × 12960 (24K UHD) uses 1,139.1 MiB. These are pixel storage estimates, not measured peak memory. WebGL depth/stencil buffers, intermediate surfaces, browser copies, PNG encoding, and other application memory raise actual peak usage; browsers do not expose a reliable total for this export.

The app does not offer 16K or 24K capture. A device-specific 4K timing and renderbuffer check do not establish that larger exports are safe. Any future resolution option needs repeated target-device measurements of render time, allocation failure, encode time, and peak process/GPU memory before it can be described as supported.
