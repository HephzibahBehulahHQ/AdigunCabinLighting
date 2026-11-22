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
      for (const unsupported of ['entry', 'toilet', 'trolley', 'emergency', 'cabin', 'sidewalls'] as const) {
        expect(profile.zones.some((zone) => zone.id === unsupported), `${profile.id}:${unsupported}`).toBe(false);
      }
      const expectedExitCount = profile.id === 'qantaslink-a220-300-137' ? 5 : 0;
      expect(profile.componentCounts.exit_signs, `${profile.id}:exit sign anchors`).toBe(expectedExitCount);
      expect(profile.zones.some((zone) => zone.id === 'exit'), `${profile.id}:exit control`).toBe(expectedExitCount > 0);
      expect(profile.componentCounts.left_sidewall_fixture_meshes, `${profile.id}:empty left-sidewall locators`).toBe(0);
      expect(profile.componentCounts.right_sidewall_fixture_meshes, `${profile.id}:empty right-sidewall locators`).toBe(0);
      expect(profile.componentCounts.left_sidewall_lights, `${profile.id}:modeled left-sidewall light source`).toBe(1);
      expect(profile.componentCounts.right_sidewall_lights, `${profile.id}:modeled right-sidewall light source`).toBe(1);
      const expectedReadingCount = profile.id === 'qantaslink-a220-300-137' ? 10 : 0;
      expect(profile.componentCounts.reading_fixtures, `${profile.id}:reading fixtures`).toBe(expectedReadingCount);
      expect(profile.componentCounts.spotlight_fixtures, `${profile.id}:spotlight fixtures`).toBe(0);
      expect(profile.componentCounts.ceiling_panels, `${profile.id}:ceiling panels`).toBe(0);
      expect(profile.zones.some((zone) => zone.id === 'reading'), `${profile.id}:reading control`).toBe(expectedReadingCount > 0);
      expect(profile.zones.map((zone) => zone.id), `${profile.id}:unmodeled light groups`).not.toContain('spotlights');
      expect(profile.zones.map((zone) => zone.id), `${profile.id}:unmodeled ceiling shell`).not.toContain('ceiling');
      expect(profile.zones.find((zone) => zone.id === 'left_sidewall')?.basis, `${profile.id}:left-sidewall evidence`).toContain('1 modeled left-sidewall light strip mesh');
      expect(profile.zones.find((zone) => zone.id === 'right_sidewall')?.basis, `${profile.id}:right-sidewall evidence`).toContain('1 modeled right-sidewall light strip mesh');
      const authoredFixtures = profile.zones.filter((zone) => zone.id.startsWith('fixture:'));
      expect(authoredFixtures.length, `${profile.id}:authored independent fixture inventory`).toBeGreaterThan(0);
      expect(new Set(authoredFixtures.map((fixture) => fixture.id)).size, `${profile.id}:unique authored fixture ids`).toBe(authoredFixtures.length);
      for (const fixture of authoredFixtures) {
        expect(fixture.source_node_name, `${profile.id}:${fixture.id}:source node`).toBeTruthy();
        expect(fixture.parent_zone_id, `${profile.id}:${fixture.id}:parent`).toBeTruthy();
        expect(['mesh', 'locator'], `${profile.id}:${fixture.id}:source kind`).toContain(fixture.source_kind);
      }
      expect(authoredFixtures.filter((fixture) => fixture.source_kind === 'locator' && fixture.parent_zone_id === 'left_sidewall').length, `${profile.id}:left locators`).toBe(profile.componentCounts.left_sidewall_fixture_anchors);
      expect(authoredFixtures.filter((fixture) => fixture.source_kind === 'locator' && fixture.parent_zone_id === 'right_sidewall').length, `${profile.id}:right locators`).toBe(profile.componentCounts.right_sidewall_fixture_anchors);
      expect(getProfileZones(profile, makeZones()).filter((zone) => zone.id.startsWith('fixture:')), `${profile.id}:inspector fixtures`).toHaveLength(authoredFixtures.length);
    }
  });

  it('keeps cabin-specific differences between the dimension models and airline layouts', () => {
    expect(AIRLINE_MESH_PROFILES).toHaveLength(6);
    for (const profile of AIRLINE_MESH_PROFILES) {
      expect(profile.zones.some((zone) => zone.id === 'reading')).toBe(profile.id === 'qantaslink-a220-300-137');
      expect(profile.zones.map((zone) => zone.id)).not.toContain('monuments');
      expect(profile.zones.map((zone) => zone.id)).not.toContain('spotlights');
    }
    const vip = AIRCRAFT_MESH_PROFILES.find((profile) => profile.id === 'gulfstream-g650er');
    expect(vip?.componentCounts.overhead_bins).toBe(0);
    expect(vip?.zones.find((zone) => zone.id === 'handrail')).toMatchObject({ name: 'VIP console edge' });
    expect(vip?.zones.map((zone) => zone.id)).not.toContain('ceiling');
    expect(vip?.zones.map((zone) => zone.id)).toContain('ceiling_cove');
  });
});

