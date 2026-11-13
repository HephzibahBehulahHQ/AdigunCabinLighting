# OEM SDK contract

This package defines the typed adapter boundary and an `unsupported` implementation. It makes no vendor or aircraft compatibility claim. The current adapter is permanently disconnected, reports no capabilities, and cannot produce a device command. The contract intentionally has no connect, send, commit, or actuation method.

`OemSceneIntent` uses normalized linear RGBW values. A future adapter must define conversion only from an approved, versioned OEM/operator ICD and verified fixture data; this package does not infer electrical limits, command formats, or cabin mappings.

The required evidence states are `unsupported`, `specified`, `bench_verified`, `OEM_verified`, and `airworthiness_approved`. The states are gates, not a support badge. See [the ICD worksheet](../../docs/integrations/OEM_INTERFACE_REQUIREMENTS.md) for current missing inputs. No physical output or aircraft connection is available in this SDK.
