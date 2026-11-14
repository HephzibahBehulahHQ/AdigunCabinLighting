# Scene transition easing

Scene keyframes may include an optional `easing` value. It applies to the interval ending at that keyframe and to every zone's RGBW channels in that interval:

- `linear`: constant interpolation rate; this remains the default for existing saved scenes and imported files without an easing field.
- `smoothstep`: gradual start and finish using the cubic smoothstep curve.
- `cubicInOut`: stronger cubic ease-in/ease-out for a longer staged transition.

The existing scene library and timeline playback use this metadata without adding or moving Studio controls. Several built-in scenes use eased transitions. Scene JSON import/export and browser-local project save retain the easing field, so playback remains reproducible after reload. Adding or replacing a keyframe through the existing actions preserves that keyframe's easing when one was already set.

This is a visual simulator interpolation curve. It is not a measured lamp response, aircraft fixture specification, or validated physical fade profile. No physical output is enabled.
