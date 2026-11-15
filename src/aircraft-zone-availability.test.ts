import { describe, expect, it } from 'vitest';
import { AIRCRAFT_MESH_PROFILES, AIRLINE_MESH_PROFILES, getProfileZones } from './aircraft-assets';
import { makeZones } from './scene-engine';

describe('aircraft mesh zone inventory', () => {
  it('maps every bundled aircraft and airline GLB to evidence-backed inspector zones', () => {
    expect(AIRCRAFT_MESH_PROFILES).toHaveLength(29);
    for (const profile of AIRCRAFT_MESH_PROFILES) {
      expect(profile.componentCounts, profile.id).toBeDefined();
      expect(profile.zones.length, profile.id).toBeGreaterThan(0);
      expect(new Set(profile.zones.map((zone) => zone.id)).size, profile.id).toBe(profile.zones.length);
      const available = getProfileZones(profile, makeZones());
      expect(available.map((zone) => zone.id).sort(), profile.id).toEqual(profile.zones.map((zone) => zone.id).sort());
      expect(available.every((zone) => zone.detail.length > 0), profile.id).toBe(true);
      for (const zone of profile.zones) expect(zone.basis, `${profile.id}:${zone.id}`).not.toMatch(/fallback|estimated/i);
      for (const unsupported of ['entry', 'toilet', 'trolley', 'emergency', 'exit', 'cabin', 'sidewalls'] as const) {
        expect(profile.zones.some((zone) => zone.id === unsupported), `${profile.id}:${unsupported}`).toBe(false);
      }
    }
  });

  it('keeps cabin-specific differences between the dimension models and airline layouts', () => {
    expect(AIRLINE_MESH_PROFILES).toHaveLength(6);
    for (const profile of AIRLINE_MESH_PROFILES) {
      expect(profile.zones.map((zone) => zone.id)).toContain('reading');
      expect(profile.zones.map((zone) => zone.id)).not.toContain('monuments');
      expect(profile.zones.map((zone) => zone.id)).not.toContain('spotlights');
    }
    const vip = AIRCRAFT_MESH_PROFILES.find((profile) => profile.id === 'gulfstream-g650er');
    expect(vip?.componentCounts.overhead_bins).toBe(0);
    expect(vip?.zones.find((zone) => zone.id === 'handrail')).toMatchObject({ name: 'VIP console edge' });
    expect(vip?.zones.find((zone) => zone.id === 'ceiling')).toMatchObject({ name: 'Upper-sidewall ceiling wash' });
  });
});
