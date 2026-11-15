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
  ceiling: 'authored simulation above-bin ceiling wash fixtures',
  windows: 'authored simulation fixtures at modeled window panes',
  sidewalls: 'procedural sidewall wash strips',
  footwell: 'procedural low-level aisle strip',
  reading: 'authored simulation per-seat task fixture above modeled headrest bounds',
  entry: 'procedural entry-area strip geometry',
  monuments: 'procedural monument-area strip geometry',
  toilet: 'procedural lavatory-area strip geometry',
  handrail: 'authored simulation strip at the aisle-facing lower edge of each modeled bin',
  trolley: 'procedural service-area strip geometry',
  cabin: 'procedural general cabin wash geometry',
  ceiling_cove: 'authored simulation mesh material group: ceiling_cove',
  left_sidewall: 'authored simulation mesh material group: left_sidewall',
  right_sidewall: 'authored simulation mesh material group: right_sidewall',
  spotlights: 'authored simulation spotlight at modeled galley or monument bounds',
  emergency: 'authored simulation low-level aisle-edge escape-path guides',
  exit: 'authored simulation estimated cabin-end cue; no exit station in supplied geometry',
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

