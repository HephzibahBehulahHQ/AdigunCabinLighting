import { describe, expect, it } from 'vitest';
import { CABIN_EXPORT_4K, canRenderExport, estimateRgbaSurfaceMiB } from './export-capabilities';

describe('cabin export capability estimates', () => {
  it('requires the renderbuffer edge limit to fit both export dimensions', () => {
    expect(canRenderExport(4096, CABIN_EXPORT_4K.width, CABIN_EXPORT_4K.height)).toBe(true);
    expect(canRenderExport(2160, CABIN_EXPORT_4K.width, CABIN_EXPORT_4K.height)).toBe(false);
    expect(canRenderExport(Number.NaN, 3840, 2160)).toBe(false);
  });

  it('reports the minimum RGBA surface footprint without claiming peak memory', () => {
    expect(estimateRgbaSurfaceMiB(3840, 2160)).toBeCloseTo(31.64, 2);
    expect(estimateRgbaSurfaceMiB(15360, 8640)).toBeCloseTo(506.25, 2);
    expect(estimateRgbaSurfaceMiB(23040, 12960)).toBeCloseTo(1139.06, 1);
    expect(() => estimateRgbaSurfaceMiB(0, 2160)).toThrow(/positive integers/);
  });
});
