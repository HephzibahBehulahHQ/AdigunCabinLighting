/** Evidence state required before any OEM adapter can claim compatibility. */
export const OEM_ADAPTER_STATES = [
  'unsupported',
  'specified',
  'bench_verified',
  'OEM_verified',
  'airworthiness_approved',
] as const;

export type OemAdapterState = (typeof OEM_ADAPTER_STATES)[number];

export type OemAdapterBlocker =
  | 'NO_APPROVED_INTERFACE_CONTROL_DOCUMENT'
  | 'NO_INTEGRATION_AUTHORIZATION'
  | 'NO_DEVICE_TRANSPORT'
  | 'NO_CONFORMANCE_EVIDENCE';

export interface OemCapability {
  readonly id: string;
  readonly evidenceRef: string;
}

export interface OemAdapterReport {
  readonly adapterId: string;
  readonly state: OemAdapterState;
  readonly mode: 'AIRCRAFT_LOCKED';
  readonly connected: false;
  readonly physicalOutputEnabled: false;
  readonly manufacturer: null;
  readonly aircraftModel: null;
  readonly capabilities: readonly OemCapability[];
  readonly evidenceRefs: readonly string[];
  readonly blockers: readonly OemAdapterBlocker[];
}

/** Scene values are normalized linear intensities; conversion requires a documented ICD. */
export interface OemSceneIntent {
  readonly sceneRevision: string;
  readonly zones: readonly {
    readonly zoneId: string;
    readonly rgbwLinear: Readonly<{ r: number; g: number; b: number; w: number }>;
  }[];
}

export interface OemTranslationResult {
  readonly accepted: false;
  readonly code: 'OEM_ADAPTER_UNSUPPORTED';
  readonly command: null;
  readonly blockers: readonly OemAdapterBlocker[];
}

/** The SDK deliberately defines no connect, send, commit, or actuation method. */
export interface OemAdapter {
  getReport(): OemAdapterReport;
  translateScene(intent: OemSceneIntent): OemTranslationResult;
}

const BLOCKERS: readonly OemAdapterBlocker[] = Object.freeze([
  'NO_APPROVED_INTERFACE_CONTROL_DOCUMENT',
  'NO_INTEGRATION_AUTHORIZATION',
  'NO_DEVICE_TRANSPORT',
  'NO_CONFORMANCE_EVIDENCE',
]);

/** Creates an honest unsupported contract, not a vendor adapter or aircraft integration. */
export function createUnsupportedOemAdapter(adapterId: string): OemAdapter {
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/i.test(adapterId)) {
    throw new Error('adapterId must be a 2–64 character identifier.');
  }

  const report: OemAdapterReport = Object.freeze({
    adapterId,
    state: 'unsupported',
    mode: 'AIRCRAFT_LOCKED',
    connected: false,
    physicalOutputEnabled: false,
    manufacturer: null,
    aircraftModel: null,
    capabilities: Object.freeze([]),
    evidenceRefs: Object.freeze([]),
    blockers: BLOCKERS,
  });

  return Object.freeze({
    getReport: () => report,
    translateScene: (intent: OemSceneIntent): OemTranslationResult => {
      void intent;
      return Object.freeze({
        accepted: false,
        code: 'OEM_ADAPTER_UNSUPPORTED',
        command: null,
        blockers: BLOCKERS,
      });
    },
  });
}
