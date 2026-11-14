import { ZONE_IDS, ZONE_INFO, type ZoneId } from './scene-engine.js';

export type FixtureEvidenceStatus = 'MISSING';

export interface ZoneFixtureRecord {
  readonly zoneId: ZoneId;
  readonly zoneName: string;
  /** A name for the procedural visual group; it is not a real fixture identity. */
  readonly referenceGeometry: string;
  /** RGBW are the simulator's normalized scene channels, not verified fixture behavior. */
  readonly simulatorChannels: readonly ['r', 'g', 'b', 'w'];
  readonly fixtureIdentity: null;
  readonly installationCoordinates: null;
  readonly photometricData: null;
  readonly documentationStatus: FixtureEvidenceStatus;
  readonly source: null;
}

const REFERENCE_GEOMETRY: Record<ZoneId, string> = {
  ceiling: 'procedural ceiling strip geometry',
  windows: 'procedural window-surround strips and panes',
  sidewalls: 'procedural sidewall wash strips',
  footwell: 'procedural low-level aisle strip',
  reading: 'procedural seat-level point markers',
  entry: 'procedural entry-area strip geometry',
  monuments: 'procedural monument-area strip geometry',
  toilet: 'procedural lavatory-area strip geometry',
  handrail: 'procedural handrail-area strip geometry',
  trolley: 'procedural service-area strip geometry',
  cabin: 'procedural general cabin wash geometry',
};

/**
 * Records the current simulator-to-reference-model association. Every real
 * fixture identity, installed position, and photometric property stays missing
 * until documentation for an approved cabin fit is supplied.
 */
export const ZONE_FIXTURE_REGISTER: Record<ZoneId, ZoneFixtureRecord> = Object.fromEntries(
  ZONE_IDS.map((zoneId) => [zoneId, {
    zoneId,
    zoneName: ZONE_INFO[zoneId].name,
    referenceGeometry: REFERENCE_GEOMETRY[zoneId],
    simulatorChannels: ['r', 'g', 'b', 'w'] as const,
    fixtureIdentity: null,
    installationCoordinates: null,
    photometricData: null,
    documentationStatus: 'MISSING' as const,
    source: null,
  } satisfies ZoneFixtureRecord]),
) as Record<ZoneId, ZoneFixtureRecord>;

export function fixtureCoverageForZones(zoneIds: readonly ZoneId[]) {
  const missingDocumentationZones = zoneIds.filter((zoneId) => ZONE_FIXTURE_REGISTER[zoneId].documentationStatus === 'MISSING');
  return {
    status: missingDocumentationZones.length === 0 ? 'DOCUMENTED' as const : 'MISSING_FIXTURE_DOCUMENTATION' as const,
    checkedZoneCount: zoneIds.length,
    documentedZoneCount: zoneIds.length - missingDocumentationZones.length,
    missingDocumentationZones,
  };
}
