import { describe, expect, it } from 'vitest';
import { CABIN_PROFILES, DEFAULT_CABIN_CONFIG } from './cabin-config';
import { PRESETS } from './scene-engine';
import { createExportPreflightReport } from './export-preflight';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('offline export preflight report', () => {
  it('records source revision, missing fixture coverage, and a reproducible preset comparison', () => {
    const baseline = copy(PRESETS.find((item) => item.id === 'rest')!);
    const proposed = copy(baseline);
    proposed.keyframes[0].targets.ceiling.r += 1;
    const report = createExportPreflightReport(proposed, CABIN_PROFILES.a330300, baseline, '2026-11-14T00:00:00.000Z');

    expect(report.sceneValidation).toEqual({ status: 'VALID', issue: null });
    expect(report.sceneData).toEqual(proposed);
    expect(report.sceneComparison.status).toBe('COMPARED');
    expect(report.sceneComparison.changes?.summary.changedTargets).toBeGreaterThan(0);
    expect(report.cabinProfile.sourceRevision).toContain('Dec 01/25');
    expect(report.cabinProfile.planningDocumentUrl).toContain('AC_A330_20251201.pdf');
    expect(report.cabinProfile.assetRights).toContain('permission not recorded');
    expect(report.reportVersion).toBe(2);
    expect(report.cabinProfile.fieldEvidence).toContainEqual(expect.objectContaining({
      field: 'lengthMeters', value: 50.36, classification: 'MANUFACTURER_PLANNING_DATA',
      sourceUrl: report.cabinProfile.planningDocumentUrl,
    }));
    expect(report.cabinProfile.fieldEvidence).toContainEqual(expect.objectContaining({
      field: 'seatPlan.Economy[1].displayRows', value: 33, classification: 'DERIVED_FOR_RENDERING',
    }));
    expect(report.cabinProfile.fieldEvidence).toContainEqual(expect.objectContaining({
      field: 'ceilingHeightMeters', classification: 'ILLUSTRATIVE_MODEL', sourceUrl: null,
    }));
    expect(report.cabinProfile.fieldEvidence).toContainEqual(expect.objectContaining({
      field: 'seatPitchMeters', classification: 'DERIVED_FOR_RENDERING',
      sourceUrl: report.cabinProfile.planningDocumentUrl,
    }));
    expect(report.fixtureCoverage.checkedZoneCount).toBe(11);
    expect(report.fixtureCoverage.documentedZoneCount).toBe(0);
    expect(report.fixtureEvidence).toHaveLength(11);
    expect(report.fixtureEvidence).toContainEqual(expect.objectContaining({
      zoneId: 'ceiling', documentationStatus: 'MISSING', fixtureIdentity: null,
      installationCoordinates: null, photometricData: null, source: null,
    }));
    expect(report.physicalOutputEnabled).toBe(false);
  });

  it('marks changed manufacturer dimensions as user edits and generic values as illustrative', () => {
    const edited = createExportPreflightReport(PRESETS[0], { ...CABIN_PROFILES.a350900, lengthMeters: 48.5 });
    expect(edited.cabinProfile.fieldEvidence).toContainEqual(expect.objectContaining({
      field: 'lengthMeters', value: 48.5, classification: 'USER_EDITED', referenceValue: 51.04,
      sourceUrl: edited.cabinProfile.planningDocumentUrl,
    }));

    const generic = createExportPreflightReport(PRESETS[0], CABIN_PROFILES.widebody);
    expect(generic.cabinProfile.fieldEvidence).toContainEqual(expect.objectContaining({
      field: 'lengthMeters', value: CABIN_PROFILES.widebody.lengthMeters, classification: 'ILLUSTRATIVE_MODEL', sourceUrl: null,
    }));
  });

  it('reports invalid channel values instead of exporting them as valid', () => {
    const invalid = copy(PRESETS.find((item) => item.id === 'rest')!);
    invalid.keyframes[0].targets.ceiling.r = 101;
    const report = createExportPreflightReport(invalid, DEFAULT_CABIN_CONFIG);

    expect(report.sceneValidation.status).toBe('INVALID');
    expect(report.sceneValidation.issue).toMatch(/RGBW target/i);
    expect(report.sceneComparison.status).toBe('NO_BASELINE');
  });

  it('states when no matching scene baseline exists', () => {
    const custom = copy(PRESETS[0]);
    custom.id = 'custom-flight-profile';
    const report = createExportPreflightReport(custom, DEFAULT_CABIN_CONFIG);

    expect(report.sceneComparison).toEqual({ status: 'NO_BASELINE', baselineId: null, changes: null });
    expect(report.cabinProfile.sourceRevision).toBeNull();
    expect(report.cabinProfile.assetRights).toContain('no manufacturer source');
  });
});

