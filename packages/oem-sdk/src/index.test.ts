import { describe, expect, it } from 'vitest';
import { createUnsupportedOemAdapter, OEM_ADAPTER_STATES, type OemSceneIntent } from './index.js';

describe('unsupported OEM SDK contract', () => {
  it('exposes the required evidence progression without claiming a supported vendor', () => {
    expect(OEM_ADAPTER_STATES).toEqual([
      'unsupported',
      'specified',
      'bench_verified',
      'OEM_verified',
      'airworthiness_approved',
    ]);

    const report = createUnsupportedOemAdapter('candidate.adapter').getReport();
    expect(report.state).toBe('unsupported');
    expect(report.mode).toBe('AIRCRAFT_LOCKED');
    expect(report.connected).toBe(false);
    expect(report.physicalOutputEnabled).toBe(false);
    expect(report.manufacturer).toBeNull();
    expect(report.aircraftModel).toBeNull();
    expect(report.capabilities).toEqual([]);
    expect(report.evidenceRefs).toEqual([]);
    expect(report.blockers).toContain('NO_APPROVED_INTERFACE_CONTROL_DOCUMENT');
  });

  it('never translates a scene into a device command while unsupported', () => {
    const intent: OemSceneIntent = {
      sceneRevision: 'draft-1',
      zones: [{ zoneId: 'ceiling', rgbwLinear: { r: 0.2, g: 0.1, b: 0.3, w: 0.4 } }],
    };

    const result = createUnsupportedOemAdapter('candidate.adapter').translateScene(intent);
    expect(result).toEqual({
      accepted: false,
      code: 'OEM_ADAPTER_UNSUPPORTED',
      command: null,
      blockers: [
        'NO_APPROVED_INTERFACE_CONTROL_DOCUMENT',
        'NO_INTEGRATION_AUTHORIZATION',
        'NO_DEVICE_TRANSPORT',
        'NO_CONFORMANCE_EVIDENCE',
      ],
    });
  });

  it('rejects invalid adapter identifiers', () => {
    expect(() => createUnsupportedOemAdapter('')).toThrow(/adapterId/);
    expect(() => createUnsupportedOemAdapter('vendor name')).toThrow(/adapterId/);
    expect(() => createUnsupportedOemAdapter('x'.repeat(65))).toThrow(/adapterId/);
  });
});
