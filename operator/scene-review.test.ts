import { describe, expect, it } from 'vitest';
import { PRESETS, ZONE_IDS } from '../src/scene-engine.js';
import { ZONE_FIXTURE_REGISTER } from '../src/fixture-registry.js';
import { reviewScene } from './scene-review.js';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('offline operator scene preflight', () => {
  it('reports a valid exported scene as schema-only simulation review', () => {
    const report = reviewScene(copy(PRESETS.find((scene) => scene.id === 'rest')));

    expect(report.status).toBe('valid');
    expect(report.mode).toBe('SIMULATION');
    expect(report.hardwareConnected).toBe(false);
    expect(report.physicalOutputEnabled).toBe(false);
    expect(report.validationScope).toBe('SCHEMA_ONLY');
    expect(report.scene.id).toBe('rest');
    expect(report.scene.keyframeCount).toBeGreaterThan(0);
    expect(report.scene.zoneIds.length).toBeGreaterThan(0);
    expect(report.fixtureCoverage.status).toBe('MISSING_FIXTURE_DOCUMENTATION');
    expect(report.fixtureCoverage.checkedZoneCount).toBe(11);
    expect(report.fixtureCoverage.documentedZoneCount).toBe(0);
    expect(report.fixtureCoverage.missingDocumentationZones).toEqual(report.scene.zoneIds);
    expect(report.limits.join(' ')).toContain('simulator RGBW channels do not establish physical fixture behavior');
  });

  it('rejects unsupported scene schema versions', () => {
    const scene = copy(PRESETS.find((item) => item.id === 'rest')) as { schemaVersion: number };
    scene.schemaVersion = 2;
    expect(() => reviewScene(scene)).toThrow(/schema version/i);
  });

  it('rejects channel values outside the scene-engine range', () => {
    const scene = copy(PRESETS.find((item) => item.id === 'rest'));
    scene.keyframes[0].targets.ceiling.r = 101;
    expect(() => reviewScene(scene)).toThrow(/RGBW target/i);
  });

  it('rejects a final keyframe that does not cover the full duration', () => {
    const scene = copy(PRESETS.find((item) => item.id === 'rest'));
    scene.keyframes.at(-1)!.atSeconds -= 1;
    expect(() => reviewScene(scene)).toThrow(/final keyframe/i);
  });
});

describe('zone fixture provenance register', () => {
  it('records every scene zone while leaving unsupported physical claims explicitly missing', () => {
    expect(Object.keys(ZONE_FIXTURE_REGISTER).sort()).toEqual([...ZONE_IDS].sort());
    for (const record of Object.values(ZONE_FIXTURE_REGISTER)) {
      expect(record.simulatorChannels).toEqual(['r', 'g', 'b', 'w']);
      expect(record.fixtureIdentity).toBeNull();
      expect(record.installationCoordinates).toBeNull();
      expect(record.photometricData).toBeNull();
      expect(record.documentationStatus).toBe('MISSING');
      expect(record.source).toBeNull();
      expect(record.referenceGeometry).toContain('procedural');
    }
  });
});
