import { CABIN_LAYOUTS, type CabinConfig } from './cabin-config';
import { diffScenes } from '../operator/scene-diff.js';
import { reviewScene } from '../operator/scene-review.js';
import { ZONE_IDS } from './scene-engine';

export interface ExportPreflightReport {
  readonly reportVersion: 1;
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
  };
  readonly fixtureCoverage: {
    readonly status: string;
    readonly checkedZoneCount: number;
    readonly documentedZoneCount: number;
    readonly missingDocumentationZones: readonly string[];
  };
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
    reportVersion: 1,
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
    },
    fixtureCoverage: review?.fixtureCoverage ?? {
      status: 'MISSING_FIXTURE_DOCUMENTATION',
      checkedZoneCount: ZONE_IDS.length,
      documentedZoneCount: 0,
      missingDocumentationZones: [...ZONE_IDS],
    },
    limits: [
      'RGBW channel validation checks simulator scene schema only; it does not verify real fixture capability or output.',
      'Fixture identity, installation coordinates, and photometric data are not established by this report.',
      'Scene comparison is against the named local preset when a matching baseline is available; custom scenes without a supplied baseline are marked NO_BASELINE.',
      'No hardware, gateway, aircraft, or physical output was contacted.',
    ],
  };
}
