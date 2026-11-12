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
  });

  it('accepts a valid versioned scene export', () => {
    expect(validateSceneFile(JSON.parse(JSON.stringify(PRESETS[2])))).toEqual(PRESETS[2]);
  });
});
