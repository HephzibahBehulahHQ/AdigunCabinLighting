import { describe, expect, it } from 'vitest';
import { clampChannel, interpolateRGBW, interpolateScene, PRESETS, validateSceneFile, ZONE_IDS } from './scene-engine';

describe('RGBW scene engine', () => {
  it('clamps channel boundaries and non-finite input', () => {
    expect(clampChannel(-1)).toBe(0);
    expect(clampChannel(101)).toBe(100);
    expect(clampChannel(Number.NaN)).toBe(0);
  });

  it('interpolates deterministically at the midpoint of a preset', () => {
    const scene = PRESETS.find((item) => item.id === 'sunrise')!;
    const halfway = interpolateScene(scene, 45);
    expect(halfway.ceiling.w).toBe(31);
    expect(halfway.reading.w).toBe(33);
    expect(interpolateScene(scene, 500)).toEqual(interpolateScene(scene, scene.durationSeconds));
  });

  it('interpolates per-zone fades and bounds their progress', () => {
    expect(interpolateRGBW({ r: 0, g: 20, b: 40, w: 60 }, { r: 100, g: 40, b: 0, w: 0 }, 0.5))
      .toEqual({ r: 50, g: 30, b: 20, w: 30 });
    expect(interpolateRGBW({ r: 0, g: 0, b: 0, w: 0 }, { r: 100, g: 0, b: 0, w: 0 }, 2).r).toBe(100);
  });

  it('supports smoothstep and cubic-in-out transitions while keeping legacy scenes linear', () => {
    const from = { r: 0, g: 0, b: 0, w: 0 };
    const to = { r: 100, g: 100, b: 100, w: 100 };
    expect(interpolateRGBW(from, to, .25).r).toBe(25);
    expect(interpolateRGBW(from, to, .25, 'smoothstep').r).toBe(15.625);
    expect(interpolateRGBW(from, to, .25, 'cubicInOut').r).toBe(6.25);

    const scene = structuredClone(PRESETS[0]);
    scene.durationSeconds = 100;
    scene.keyframes[1].atSeconds = 100;
    scene.keyframes[1].easing = 'smoothstep';
    scene.keyframes[0].targets.ceiling = from;
    scene.keyframes[1].targets.ceiling = to;
    expect(interpolateScene(scene, 25).ceiling.r).toBe(15.625);
    expect(validateSceneFile(scene).keyframes[1].easing).toBe('smoothstep');
  });

  it('preserves zone independence in scene targets', () => {
    const scene = PRESETS.find((item) => item.id === 'boarding')!;
    const state = interpolateScene(scene, 0);
    expect(state.ceiling).not.toEqual(state.footwell);
    expect(Object.keys(state).sort()).toEqual([...ZONE_IDS].sort());
  });

  it('rejects duplicate keyframe timestamps and out-of-range channel values', () => {
    const base = structuredClone(PRESETS[0]);
    base.keyframes[1].atSeconds = base.keyframes[0].atSeconds;
    expect(() => validateSceneFile(base)).toThrow(/increase strictly/);
    const invalid = structuredClone(PRESETS[0]);
    invalid.keyframes[1].targets.ceiling.r = 101;
    expect(() => validateSceneFile(invalid)).toThrow(/Invalid RGBW/);
    const unsupportedEasing = structuredClone(PRESETS[0]);
    unsupportedEasing.keyframes[1].easing = 'bounce' as never;
    expect(() => validateSceneFile(unsupportedEasing)).toThrow(/easing is not supported/i);
  });

  it('accepts a valid versioned scene export', () => {
    expect(validateSceneFile(JSON.parse(JSON.stringify(PRESETS[2])))).toEqual(PRESETS[2]);
  });

  it('migrates legacy six-zone scenes with safe zero values for added zones', () => {
    const legacy = structuredClone(PRESETS[0]);
    for (const frame of legacy.keyframes) {
      for (const id of ['monuments', 'toilet', 'handrail', 'trolley', 'cabin'] as const) delete frame.targets[id];
    }
    const migrated = validateSceneFile(legacy);
    for (const frame of migrated.keyframes) {
      expect(Object.keys(frame.targets).sort()).toEqual([...ZONE_IDS].sort());
      expect(frame.targets.monuments).toEqual({ r: 0, g: 0, b: 0, w: 0 });
    }
  });

  it('defines every added lighting zone for every built-in scene', () => {
    expect(PRESETS.map(({ name }) => name)).toEqual(expect.arrayContaining([
      'Wake', 'Landing', 'Relax', 'Rest', 'Prayer', 'Movie', 'First Class', 'Business Class', 'Economy', 'Window shade lighting',
    ]));
    for (const scene of PRESETS) for (const frame of scene.keyframes) {
      expect(Object.keys(frame.targets).sort()).toEqual([...ZONE_IDS].sort());
    }
  });
});
