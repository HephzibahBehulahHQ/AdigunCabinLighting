# OEM interface requirements and ICD worksheet

**Status:** No OEM adapter is supported. This worksheet records evidence needed to specify one; it does not authorize aircraft access or assert vendor compatibility.

## Required inputs before an adapter can leave `unsupported`

| Area | Required evidence | Current status |
| --- | --- | --- |
| Aircraft configuration | Exact aircraft model/series, options, cabin configuration, operator, and approved configuration baseline | Not supplied |
| Installed CMS | Manufacturer, controller part number, firmware/software version, and operator ownership | Not supplied |
| Interface authority | OEM/operator-approved ICD, permitted commands/events, licensed materials, and integration authorization | Not supplied |
| Electrical/data interface | Connector/pinout, voltage, isolation, grounding, bus protocol, timing, EMC constraints, and installation limits | Not supplied |
| Operational arbitration | Phase-of-flight behavior, crew overrides, maintenance lockout, emergency/egress independence, and fail-safe response | Not supplied |
| Security and updates | Authentication/key ownership, trust anchors, audit obligations, update restrictions, rollback and incident response | Not supplied |
| Verification | Approved simulator/bench procedure, conformance vectors, measured results, independent review, and acceptance authority | Not supplied |
| Contract and ownership | Supplier agreements, licensing, liability, software maintenance, support, and change notification | Not supplied |

## Adapter evidence states

1. `unsupported` — default. No approved ICD, authorization, implementation, or conformance evidence.
2. `specified` — approved ICD and traceable requirements exist; implementation is still disabled pending review.
3. `bench_verified` — a specified implementation passed the approved isolated bench procedure with recorded equipment and results.
4. `OEM_verified` — the OEM has provided written verification for the exact documented configuration and version.
5. `airworthiness_approved` — the responsible certification authority accepted the applicable installation/change evidence.

These labels describe evidence gates only. Passing one state does not imply the next. Public product names, cabin imagery, or a generic adapter interface do not satisfy any gate. No reverse engineering, bus spoofing, or connection to installed avionics is permitted by this project.

## ICD worksheet

Complete and approve this worksheet with the OEM/operator before any vendor-specific code is enabled:

- Aircraft model/series/options and configuration baseline:
- Operator and responsible engineering authority:
- CMS part number, software version, and approved configuration:
- ICD identifier, revision, owner, license, and approval date:
- Allowed command/event set and explicitly forbidden functions:
- Connector/pinout and electrical levels/isolation:
- Transport framing, timing, sequencing, replay protection, and error behavior:
- Crew/maintenance/safety arbitration and emergency lighting separation:
- Authentication, key provisioning, logging, retention, and update process:
- Lab/bench procedure, fixtures, instruments, calibration dates, and acceptance limits:
- Required independent reviews and signatories:
- OEM/operator verification evidence and scope:
- Certification/airworthiness approval evidence and scope:
- Adapter version, build hash, and change-control owner:

Until the fields and evidence are approved, use the SDK's `unsupported` adapter, which reports `AIRCRAFT_LOCKED` and cannot produce a device command.
