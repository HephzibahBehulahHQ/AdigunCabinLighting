import { describe, expect, it } from 'vitest';
import { CABIN_LAYOUTS, CABIN_PROFILES, DEFAULT_CABIN_CONFIG, validateCabinConfig } from './cabin-config';

describe('configurable reference cabin profile', () => {
  it('uses an original configurable reference profile', () => {
    expect(validateCabinConfig({})).toEqual(DEFAULT_CABIN_CONFIG);
  });

  it('provides distinct layouts and cabin dimensions for each reference profile', () => {
    expect(Object.keys(CABIN_PROFILES)).toHaveLength(4);
    expect(CABIN_LAYOUTS.widebody.groups).toEqual([3, 3, 3]);
    expect(CABIN_LAYOUTS.premium.groups).toEqual([1, 2, 1]);
    expect(CABIN_PROFILES.regional.widthMeters).toBeLessThan(CABIN_PROFILES.widebody.widthMeters);
    expect(CABIN_PROFILES.regional.lengthMeters).toBeLessThan(CABIN_PROFILES.widebody.lengthMeters);
  });

  it('accepts a selected layout with custom cabin dimensions', () => {
    expect(validateCabinConfig({ layoutId: 'widebody', lengthMeters: 22.4, widthMeters: 5.1, seatRows: 18 })).toMatchObject({
      layoutId: 'widebody', lengthMeters: 22.4, widthMeters: 5.1, seatRows: 18,
    });
  });

  it('bounds unsafe dimensions and rejects non-finite values', () => {
    expect(validateCabinConfig({ lengthMeters: 100, seatRows: 0, ceilingHeightMeters: Number.NaN })).toMatchObject({
      lengthMeters: 50, seatRows: 2, ceilingHeightMeters: DEFAULT_CABIN_CONFIG.ceilingHeightMeters,
    });
  });

  it('migrates older saved side-seat settings to an equivalent reference profile', () => {
    expect(validateCabinConfig({ seatsPerSide: 2 })).toMatchObject({ layoutId: 'regional', widthMeters: 3.25 });
  });
});

