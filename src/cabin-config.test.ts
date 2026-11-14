import { describe, expect, it } from 'vitest';
import { CABIN_LAYOUTS, CABIN_PROFILES, DEFAULT_CABIN_CONFIG, validateCabinConfig } from './cabin-config';

describe('configurable reference cabin profile', () => {
  it('uses an original configurable reference profile', () => {
    expect(validateCabinConfig({})).toEqual(DEFAULT_CABIN_CONFIG);
  });

  it('provides distinct layouts and cabin dimensions for each reference profile', () => {
    expect(Object.keys(CABIN_PROFILES)).toHaveLength(6);
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
      lengthMeters: 60, seatRows: 2, ceilingHeightMeters: DEFAULT_CABIN_CONFIG.ceilingHeightMeters,
    });
  });

  it('uses Airbus A350-900 sourced dimensions and preserves its published two-class seat totals', () => {
    const a350 = CABIN_LAYOUTS.a350900;
    expect(CABIN_PROFILES.a350900).toMatchObject({ layoutId: 'a350900', lengthMeters: 51.04, widthMeters: 5.71, seatRows: 38 });
    expect(a350.seatCount).toBe(315);
    expect(a350.seatPlan.reduce((sum, section) => sum + section.seatCount, 0)).toBe(315);
    expect(a350.seatPlan.reduce((sum, section) => sum + section.rows * section.groups.reduce((rowSeats, count) => rowSeats + count, 0), 0)).toBe(315);
    expect(a350.seatPlan.filter((section) => section.cabinClass === 'Business').reduce((sum, section) => sum + section.seatCount, 0)).toBe(48);
    expect(a350.seatPlan.filter((section) => section.cabinClass === 'Economy').reduce((sum, section) => sum + section.seatCount, 0)).toBe(267);
    expect(a350.seatPlan.map((section) => section.pitchMeters)).toEqual([1.524, .8128, .8128]);
    expect(validateCabinConfig({ layoutId: 'a350900' }).lengthMeters).toBe(51.04);
  });

  it('uses Airbus A330-300 planning dimensions and preserves its two-class seat totals', () => {
    const a330 = CABIN_LAYOUTS.a330300;
    expect(CABIN_PROFILES.a330300).toMatchObject({ layoutId: 'a330300', lengthMeters: 50.36, widthMeters: 5.26, seatRows: 39 });
    expect(a330.source).toContain('/a330/a330-300');
    expect(a330.seatCount).toBe(300);
    expect(a330.seatPlan.reduce((sum, section) => sum + section.seatCount, 0)).toBe(300);
    expect(a330.seatPlan.reduce((sum, section) => sum + section.rows * section.groups.reduce((rowSeats, count) => rowSeats + count, 0), 0)).toBe(300);
    expect(a330.seatPlan.filter((section) => section.cabinClass === 'Business').reduce((sum, section) => sum + section.seatCount, 0)).toBe(36);
    expect(a330.seatPlan.filter((section) => section.cabinClass === 'Economy').reduce((sum, section) => sum + section.seatCount, 0)).toBe(264);
    expect(a330.seatPlan.map((section) => section.pitchMeters)).toEqual([1.524, .8128]);
    expect(validateCabinConfig({ layoutId: 'a330300' }).lengthMeters).toBe(50.36);
  });

  it('records planning-document revisions and does not claim a licensed cabin mesh', () => {
    for (const profile of [CABIN_LAYOUTS.a330300, CABIN_LAYOUTS.a350900]) {
      expect(profile.planningSource).toMatch(/^https:\/\/.+\.pdf$/);
      expect(profile.sourceRevision).toMatch(/Rev/);
      expect(profile.assetRights).toContain('permission not recorded');
      expect(profile.assetRights).toContain('No licensed 3D cabin asset');
    }
    expect(CABIN_LAYOUTS.a330300.sourceRevision).toContain('Dec 01/25');
    expect(CABIN_LAYOUTS.a350900.sourceRevision).toContain('Jul 15/25');
  });

  it('migrates older saved side-seat settings to an equivalent reference profile', () => {
    expect(validateCabinConfig({ seatsPerSide: 2 })).toMatchObject({ layoutId: 'regional', widthMeters: 3.25 });
  });
});

