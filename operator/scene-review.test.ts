import { describe, expect, it } from 'vitest';
import { PRESETS } from '../src/scene-engine.js';
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
