import { describe, expect, it } from 'vitest';
import { CABIN_PROFILES } from '../src/cabin-config';
import { PRESETS } from '../src/scene-engine';
import { createDefaultScenario, createScenarioPackage, reviewScenarioPackage, validateScenarioPackage, validateScenarioPackageRequest } from './scenario-package';

describe('offline scenario packages', () => {
  it('bundles a cabin profile separately from multiple scene definitions', () => {
    const scenario = createDefaultScenario('A330 lighting review', 'a330300', 'boarding', [PRESETS[0], PRESETS[5]]);
    expect(scenario.cabin.config.layoutId).toBe('a330300');
    expect(scenario.cabin.profile).toMatchObject({
      sourceUrl: 'https://www.aircraft.airbus.com/en/aircraft/a330/a330-300',
      evidenceStatus: 'PLANNING_REFERENCE_ONLY',
    });
    expect(scenario.scenes.map((scene) => scene.id)).toEqual(['boarding', 'sleep']);
    expect(scenario.activeSceneId).toBe('boarding');
    expect(scenario.physicalOutputEnabled).toBe(false);
    expect(reviewScenarioPackage(scenario).fixtureCoverage.status).toBe('MISSING_FIXTURE_DOCUMENTATION');
  });

  it('marks generic and user-adjusted cabin profiles with accurate evidence scope', () => {
    const generic = createDefaultScenario('Generic cabin', 'widebody', 'boarding', [PRESETS[0]]);
    expect(generic.cabin.profile).toMatchObject({ sourceUrl: null, evidenceStatus: 'ILLUSTRATIVE_ONLY' });
    const adjusted = createScenarioPackage({
      projectName: 'Adjusted reference',
      cabinConfig: { ...CABIN_PROFILES.a350900, widthMeters: 5.6 },
      zones: generic.zones,
      scenes: [PRESETS[0]],
      activeSceneId: 'boarding',
      masterIntensity: 72,
    });
    expect(adjusted.cabin.profile.evidenceStatus).toBe('USER_ADJUSTED_REFERENCE');
  });

  it('rejects duplicate scenes, missing active scenes, incomplete zones, and invalid channel values', () => {
    const scenario = createDefaultScenario('Review', 'regional', 'boarding', [PRESETS[0]]);
    expect(() => validateScenarioPackage({ ...scenario, scenes: [PRESETS[0], PRESETS[0]] })).toThrow(/IDs must be unique/);
    expect(() => validateScenarioPackage({ ...scenario, activeSceneId: 'missing' })).toThrow(/must match a scene/);
    expect(() => validateScenarioPackage({ ...scenario, zones: scenario.zones.slice(1) })).toThrow(/exactly 11 cabin zones/);
    const invalidZone = { ...scenario.zones[0], rgbw: { ...scenario.zones[0].rgbw, w: 101 } };
    expect(() => validateScenarioPackage({ ...scenario, zones: [invalidZone, ...scenario.zones.slice(1)] })).toThrow(/invalid W value/);
  });

  it('rejects altered source claims and any physical-output package', () => {
    const scenario = createDefaultScenario('A350 review', 'a350900', 'boarding', [PRESETS[0]]);
    expect(() => validateScenarioPackage({
      ...scenario,
      cabin: { ...scenario.cabin, profile: { ...scenario.cabin.profile, sourceUrl: 'https://fake.example/fit.pdf' } },
    })).toThrow(/provenance does not match/);
    expect(() => validateScenarioPackage({ ...scenario, physicalOutputEnabled: true })).toThrow(/simulation-only/);
  });

  it('validates request manifests with spaced names and separate cabin and scene fields', () => {
    const request = validateScenarioPackageRequest({
      schemaVersion: 1,
      packageType: 'adigun-cabin-scenario-request',
      projectName: 'A330 lighting review',
      cabinLayoutId: 'a330300',
      activeSceneId: 'boarding',
      sceneFiles: ['./boarding scene.json', './sleep.json'],
      outputPath: './review package.json',
      masterIntensity: 64,
    });
    expect(request).toMatchObject({ projectName: 'A330 lighting review', cabinLayoutId: 'a330300', masterIntensity: 64 });
    expect(() => validateScenarioPackageRequest({ ...request, cabinLayoutId: 'unknown' })).toThrow(/supported cabin layout/);
    expect(() => validateScenarioPackageRequest({ ...request, sceneFiles: [] })).toThrow(/scene file paths/);
  });
});

