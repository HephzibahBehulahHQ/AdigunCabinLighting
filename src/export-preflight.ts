import { CABIN_LAYOUTS, CABIN_PROFILES, type CabinConfig } from './cabin-config';
import { diffScenes } from '../operator/scene-diff.js';
import { reviewScene } from '../operator/scene-review.js';
import { ZONE_IDS } from './scene-engine';
import { ZONE_FIXTURE_REGISTER } from './fixture-registry.js';

type CabinEvidenceClassification = 'MANUFACTURER_PLANNING_DATA' | 'DERIVED_FOR_RENDERING' | 'ILLUSTRATIVE_MODEL' | 'USER_EDITED';

interface CabinEvidenceField {
  readonly field: string;
  readonly value: number | string | readonly number[];
  readonly classification: CabinEvidenceClassification;
  readonly referenceValue?: number | string | readonly number[];
  readonly sourceUrl: string | null;
  readonly sourceRevision: string | null;
  readonly note: string;
}

export interface ExportPreflightReport {
  readonly reportVersion: 2;
  readonly generatedAt: string;
  readonly mode: 'SIMULATION';
  readonly physicalOutputEnabled: false;
  readonly validationScope: 'SCHEMA_AND_SOURCE_COVERAGE';
  readonly sceneValidation: { readonly status: 'VALID' | 'INVALID'; readonly issue: string | null };
  readonly sceneData: unknown;
  readonly sceneComparison: {
    readonly status: 'COMPARED' | 'NO_BASELINE';
    readonly baselineId: string | null;
    readonly changes: ReturnType<typeof diffScenes> | null;
  };
  readonly cabinProfile: {
    readonly id: CabinConfig['layoutId'];
    readonly name: string;
    readonly lengthMeters: number;
    readonly widthMeters: number;
    readonly sourceUrl: string | null;
    readonly planningDocumentUrl: string | null;
    readonly sourceRevision: string | null;
    readonly assetRights: string;
    readonly geometryLimit: string;
    readonly fieldEvidence: readonly CabinEvidenceField[];
  };
  readonly fixtureCoverage: {
    readonly status: string;
    readonly checkedZoneCount: number;
    readonly documentedZoneCount: number;
    readonly missingDocumentationZones: readonly string[];
  };
  readonly fixtureEvidence: readonly {
    readonly zoneId: string;
    readonly zoneName: string;
    readonly referenceGeometry: string;
    readonly simulatorChannels: readonly string[];
    readonly fixtureIdentity: null;
    readonly installationCoordinates: null;
    readonly photometricData: null;
    readonly documentationStatus: 'MISSING';
    readonly source: null;
  }[];
  readonly limits: readonly string[];
}

function serializableCopy(value: unknown): unknown {
  try {
    const json = JSON.stringify(value);
    return typeof json === 'string' ? JSON.parse(json) as unknown : null;
  } catch {
    return null;
  }
}

/** Creates an offline, reproducible preflight record. It never enables hardware output. */
export function createExportPreflightReport(
  sceneValue: unknown,
  cabin: CabinConfig,
  baselineValue?: unknown,
  generatedAt = new Date().toISOString(),
): ExportPreflightReport {
  const profile = CABIN_LAYOUTS[cabin.layoutId];
  const manufacturerReference = 'planningSource' in profile ? profile : null;
  const sourceUrl = manufacturerReference?.planningSource ?? null;
  const sourceRevision = manufacturerReference?.sourceRevision ?? null;
  const evidenceField = (
    field: string,
    value: number | string | readonly number[],
    classification: CabinEvidenceClassification,
    note: string,
    referenceValue?: number | string | readonly number[],
  ): CabinEvidenceField => ({
    field,
    value,
    classification,
    ...(referenceValue === undefined ? {} : { referenceValue }),
    sourceUrl: manufacturerReference && classification !== 'ILLUSTRATIVE_MODEL' ? sourceUrl : null,
    sourceRevision: manufacturerReference && classification !== 'ILLUSTRATIVE_MODEL' ? sourceRevision : null,
    note,
  });
  const configuredFields = [
    ['lengthMeters', cabin.lengthMeters, 'Cabin length'],
    ['widthMeters', cabin.widthMeters, 'Maximum cabin width'],
    ['ceilingHeightMeters', cabin.ceilingHeightMeters, 'Cabin ceiling height'],
    ['seatRows', cabin.seatRows, 'Displayed seat rows'],
    ['seatPitchMeters', cabin.seatPitchMeters, 'Cabin control seat pitch'],
    ['windowCountPerSide', cabin.windowCountPerSide, 'Window count per side'],
    ['overheadBinDepthMeters', cabin.overheadBinDepthMeters, 'Overhead bin depth'],
  ] as const;
  const fieldEvidence: CabinEvidenceField[] = configuredFields.map(([field, value, label]) => {
    const referenceValue = CABIN_PROFILES[cabin.layoutId][field];
    let classification: CabinEvidenceClassification = 'ILLUSTRATIVE_MODEL';
    let note = 'Editable reference value; no aircraft-specific source is recorded.';
    if (manufacturerReference && (field === 'lengthMeters' || field === 'widthMeters')) {
      classification = value === referenceValue ? 'MANUFACTURER_PLANNING_DATA' : 'USER_EDITED';
      note = value === referenceValue
        ? `${label} matches the cited manufacturer planning reference.`
        : `Edited from the cited planning baseline of ${referenceValue}; the current value is user supplied.`;
    } else if (manufacturerReference && field === 'seatPitchMeters') {
      classification = value === referenceValue ? 'DERIVED_FOR_RENDERING' : 'USER_EDITED';
      note = value === referenceValue
        ? 'The single viewer control uses economy pitch as a rendering reference; class-specific published pitches are listed in the seat plan below.'
        : `Edited from the illustrative rendering baseline of ${referenceValue}; class-specific planning pitches remain listed below.`;
    } else if (manufacturerReference && field === 'seatRows') {
      classification = value === referenceValue ? 'DERIVED_FOR_RENDERING' : 'USER_EDITED';
      note = value === referenceValue
        ? 'Displayed row count is derived for the illustrative viewport; it is not a manufacturer row arrangement.'
        : `Edited from the illustrative rendering baseline of ${referenceValue}; the current value is user supplied.`;
    }
    return evidenceField(field, value, classification, note, classification === 'USER_EDITED' ? referenceValue : undefined);
  });
  if ('seatPlan' in profile) {
    fieldEvidence.push(evidenceField('seatCount', profile.seatCount, 'MANUFACTURER_PLANNING_DATA', profile.seatCountBasis));
    const sectionOccurrences = new Map<string, number>();
    for (const section of profile.seatPlan) {
      const sectionIndex = (sectionOccurrences.get(section.cabinClass) ?? 0) + 1;
      sectionOccurrences.set(section.cabinClass, sectionIndex);
      const sectionKey = `${section.cabinClass}[${sectionIndex}]`;
      fieldEvidence.push(evidenceField(
        `seatPlan.${sectionKey}.seatCount`, section.seatCount, 'MANUFACTURER_PLANNING_DATA',
        'Class seat total from the cited planning example.',
      ));
      fieldEvidence.push(evidenceField(
        `seatPlan.${sectionKey}.seatsPerRow`, section.groups, 'MANUFACTURER_PLANNING_DATA',
        'Published seat grouping used by the standard planning example.',
      ));
      fieldEvidence.push(evidenceField(
        `seatPlan.${sectionKey}.pitchMeters`, section.pitchMeters, 'MANUFACTURER_PLANNING_DATA',
        'Class seat pitch from the cited planning example.',
      ));
      fieldEvidence.push(evidenceField(
        `seatPlan.${sectionKey}.displayRows`, section.rows, 'DERIVED_FOR_RENDERING',
        'Row count is arranged by the viewer to represent the published total and is not an OEM cabin layout.',
      ));
    }
  } else {
    fieldEvidence.push(evidenceField('seatGroups', CABIN_LAYOUTS[cabin.layoutId].groups, 'ILLUSTRATIVE_MODEL', 'Generic seat grouping for visual reference; no aircraft-specific plan is recorded.'));
  }
  let validationIssue: string | null = null;
  let review: ReturnType<typeof reviewScene> | null = null;
  try {
    review = reviewScene(sceneValue);
  } catch (error) {
    validationIssue = error instanceof Error ? error.message : 'Scene validation failed.';
  }

  let changes: ReturnType<typeof diffScenes> | null = null;
  let comparisonStatus: 'COMPARED' | 'NO_BASELINE' = 'NO_BASELINE';
  if (review && baselineValue !== undefined) {
    try {
      changes = diffScenes(baselineValue, sceneValue);
      comparisonStatus = 'COMPARED';
    } catch (error) {
      validationIssue ??= error instanceof Error ? `Scene comparison failed: ${error.message}` : 'Scene comparison failed.';
    }
  }

  return {
    reportVersion: 2,
    generatedAt,
    mode: 'SIMULATION',
    physicalOutputEnabled: false,
    validationScope: 'SCHEMA_AND_SOURCE_COVERAGE',
    sceneValidation: { status: review ? 'VALID' : 'INVALID', issue: validationIssue },
    sceneData: serializableCopy(sceneValue),
    sceneComparison: {
      status: comparisonStatus,
      baselineId: comparisonStatus === 'COMPARED' && baselineValue && typeof baselineValue === 'object' && 'id' in baselineValue
        ? String(baselineValue.id)
        : null,
      changes,
    },
    cabinProfile: {
      id: cabin.layoutId,
      name: profile.name,
      lengthMeters: cabin.lengthMeters,
      widthMeters: cabin.widthMeters,
      sourceUrl: 'source' in profile ? profile.source : null,
      planningDocumentUrl: manufacturerReference?.planningSource ?? null,
      sourceRevision: manufacturerReference?.sourceRevision ?? null,
      assetRights: manufacturerReference
        ? manufacturerReference.assetRights
        : 'Illustrative reference layout; no manufacturer source or licensed 3D cabin asset is recorded.',
      geometryLimit: 'Viewer geometry is procedural and illustrative; no airline cabin fit or photometric result is established.',
      fieldEvidence,
    },
    fixtureCoverage: review?.fixtureCoverage ?? {
      status: 'MISSING_FIXTURE_DOCUMENTATION',
      checkedZoneCount: ZONE_IDS.length,
      documentedZoneCount: 0,
      missingDocumentationZones: [...ZONE_IDS],
    },
    fixtureEvidence: ZONE_IDS.map((zoneId) => {
      const fixture = ZONE_FIXTURE_REGISTER[zoneId];
      return {
        zoneId: fixture.zoneId,
        zoneName: fixture.zoneName,
        referenceGeometry: fixture.referenceGeometry,
        simulatorChannels: fixture.simulatorChannels,
        fixtureIdentity: fixture.fixtureIdentity,
        installationCoordinates: fixture.installationCoordinates,
        photometricData: fixture.photometricData,
        documentationStatus: fixture.documentationStatus,
        source: fixture.source,
      };
    }),
    limits: [
      'RGBW channel validation checks simulator scene schema only; it does not verify real fixture capability or output.',
      'Fixture identity, installation coordinates, and photometric data are not established by this report.',
      'Scene comparison is against the named local preset when a matching baseline is available; custom scenes without a supplied baseline are marked NO_BASELINE.',
      'No hardware, gateway, aircraft, or physical output was contacted.',
    ],
  };
}

