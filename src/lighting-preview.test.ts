import { describe, expect, it } from 'vitest';
import { composePreviewRGB, previewLightLevel } from './lighting-preview';

describe('RGBW visual preview helpers', () => {
  it('blends the white channel equally into the on-screen RGB color', () => {
    expect(composePreviewRGB({ r: 10, g: 30, b: 50, w: 20 })).toEqual({ r: 37, g: 57, b: 75 });
  });

  it('clips mixed channels and treats invalid values as zero', () => {
    expect(composePreviewRGB({ r: 95, g: -4, b: Number.NaN, w: 20 })).toEqual({ r: 100, g: 27, b: 27 });
  });

  it('keeps RGBW zeros dark while applying a display-only curve to dim channels', () => {
    expect(composePreviewRGB({ r: 0, g: 0, b: 0, w: 0 })).toEqual({ r: 0, g: 0, b: 0 });
    expect(composePreviewRGB({ r: 8, g: 0, b: 0, w: 0 }).r).toBeGreaterThan(8);
  });

  it('keeps zero output dark and lifts low output monotonically for display', () => {
    const zero = { r: 0, g: 0, b: 0, w: 0 };
    expect(previewLightLevel(zero, 100)).toBe(0);
    expect(previewLightLevel({ r: 10, g: 0, b: 0, w: 0 }, 100)).toBeGreaterThan(.1);
    expect(previewLightLevel({ r: 50, g: 0, b: 0, w: 0 }, 100)).toBeGreaterThan(previewLightLevel({ r: 10, g: 0, b: 0, w: 0 }, 100));
    expect(previewLightLevel({ r: 100, g: 0, b: 0, w: 0 }, 100)).toBe(1);
  });

  it('respects master intensity and clamps invalid or out-of-range input', () => {
    const rgbw = { r: 80, g: 0, b: 0, w: 0 };
    expect(previewLightLevel(rgbw, 0)).toBe(0);
    expect(previewLightLevel(rgbw, 50)).toBeLessThan(previewLightLevel(rgbw, 100));
    expect(previewLightLevel({ r: 1000, g: 0, b: 0, w: 0 }, 1000)).toBe(1);
    expect(previewLightLevel({ r: Number.NaN, g: 0, b: 0, w: 0 }, Number.NaN)).toBe(0);
  });
});
