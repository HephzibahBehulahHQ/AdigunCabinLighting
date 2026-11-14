import { CABIN_LAYOUTS, CABIN_PROFILES, validateCabinConfig, type CabinConfig, type CabinLayoutId } from '../src/cabin-config.js';
import { fixtureCoverageForZones } from '../src/fixture-registry.js';
import { makeDefaultZones, validateSceneFile, ZONE_IDS, type RGBW, type SceneFile, type ZoneId, type ZoneState } from '../src/scene-engine.js';

export const MAX_SCENARIO_SCENES = 32;
export const MAX_PROJECT_NAME_LENGTH = 80;
export const MAX_SCENARIO_PACKAGE_BYTES = 64 * 1024;

export interface ScenarioPackageInput {
  readonly projectName: string;
  readonly cabinConfig: CabinConfig;
  readonly zones: readonly ZoneState[];
  readonly scenes: readonly SceneFile[];
  readonly activeSceneId: string;
  readonly masterIntensity: number;
}

export interface ScenarioPackageRequest {
  readonly schemaVersion: 1;
  readonly packageType: 'adigun-cabin-scenario-request';
  readonly projectName: string;
  readonly cabinLayoutId: CabinLayoutId;
  readonly activeSceneId: string;
  readonly sceneFiles: readonly string[];
  readonly outputPath: string;
  readonly masterIntensity?: number;
}

export interface ScenarioPackage {
  readonly schemaVersion: 1;
  readonly packageType: 'adigun-cabin-scenario';
  readonly projectName: string;
  readonly mode: 'SIMULATION';
  readonly physicalOutputEnabled: false;
  /** Kept separate from scenes so layout selection cannot mutate scene content. */
  readonly cabin: {
    readonly config: CabinConfig;
    readonly profile: {
      readonly id: CabinLayoutId;
      readonly name: string;
      readonly sourceUrl: string | null;
      readonly evidenceStatus: 'PLANNING_REFERENCE_ONLY' | 'USER_ADJUSTED_REFERENCE' | 'ILLUSTRATIVE_ONLY';
      readonly limits: string;
    };
  };
  readonly zones: readonly ZoneState[];
  readonly scenes: readonly SceneFile[];
  readonly activeSceneId: string;
  readonly masterIntensity: number;
}

export interface ScenarioReviewReport {
  readonly status: 'valid';
  readonly mode: 'SIMULATION';
  readonly physicalOutputEnabled: false;
  readonly projectName: string;
  readonly cabinProfile: ScenarioPackage['cabin']['profile'];
  readonly sceneCount: number;
  readonly sceneIds: readonly string[];
  readonly activeSceneId: string;
  readonly zoneCount: number;
  readonly fixtureCoverage: ReturnType<typeof fixtureCoverageForZones>;
  readonly limits: readonly string[];
}

const CONFIG_CHANNELS = ['lengthMeters', 'widthMeters', 'ceilingHeightMeters', 'seatRows', 'seatPitchMeters', 'windowCountPerSide', 'overheadBinDepthMeters'] as const;
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateScenarioPackageRequest(value: unknown): ScenarioPackageRequest {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.packageType !== 'adigun-cabin-scenario-request') {
    throw new Error('Unsupported scenario request type or schema version.');
  }
  if (typeof value.cabinLayoutId !== 'string' || !Object.hasOwn(CABIN_LAYOUTS, value.cabinLayoutId)) {
    throw new Error('Scenario request must name a supported cabin layout ID.');
  }
  if (!Array.isArray(value.sceneFiles) || value.sceneFiles.length === 0 || value.sceneFiles.length > MAX_SCENARIO_SCENES
    || value.sceneFiles.some((path) => typeof path !== 'string' || path.trim() !== path || path.length === 0 || path.length > 512)) {
    throw new Error(`Scenario request must list 1–${MAX_SCENARIO_SCENES} scene file paths.`);
  }
  const projectName = requireText(value.projectName, 'Project name', MAX_PROJECT_NAME_LENGTH);
  const activeSceneId = requireText(value.activeSceneId, 'Active scene ID', 80);
  const outputPath = requireText(value.outputPath, 'Output path', 512);
  if (value.masterIntensity !== undefined && (typeof value.masterIntensity !== 'number' || !Number.isFinite(value.masterIntensity) || value.masterIntensity < 0 || value.masterIntensity > 100)) {
    throw new Error('Scenario request master intensity must be between 0 and 100.');
  }
  return {
    schemaVersion: 1,
    packageType: 'adigun-cabin-scenario-request',
    projectName,
    cabinLayoutId: value.cabinLayoutId as CabinLayoutId,
    activeSceneId,
    sceneFiles: [...value.sceneFiles] as string[],
    outputPath,
    ...(value.masterIntensity === undefined ? {} : { masterIntensity: value.masterIntensity as number }),
  };
}

function requireText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || value.length > maxLength) {
    throw new Error(`${label} must be non-empty text up to ${maxLength} characters.`);
  }
  return value;
}

function requireConfig(value: unknown): CabinConfig {
  if (!isRecord(value) || typeof value.layoutId !== 'string' || !Object.hasOwn(CABIN_LAYOUTS, value.layoutId)) {
    throw new Error('Cabin profile has an unknown layout ID.');
  }
  for (const key of CONFIG_CHANNELS) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) throw new Error(`Cabin profile ${key} must be a finite number.`);
  }
  const config = validateCabinConfig(value as Partial<CabinConfig>);
  if (CONFIG_CHANNELS.some((key) => config[key] !== value[key])) throw new Error('Cabin profile values are outside supported bounds or are not normalized.');
  return config;
}

function profileEvidence(config: CabinConfig): ScenarioPackage['cabin']['profile'] {
  const info = CABIN_LAYOUTS[config.layoutId] as { name: string; description: string; source?: string; geometryNote?: string };
  const sourceUrl = info.source ?? null;
  const baseline = CABIN_PROFILES[config.layoutId];
  const adjusted = CONFIG_CHANNELS.some((key) => config[key] !== baseline[key]);
  return {
    id: config.layoutId,
    name: info.name,
    sourceUrl,
    evidenceStatus: sourceUrl ? adjusted ? 'USER_ADJUSTED_REFERENCE' : 'PLANNING_REFERENCE_ONLY' : 'ILLUSTRATIVE_ONLY',
    limits: sourceUrl
      ? info.geometryNote ?? 'Planning data source only; geometry is illustrative and is not an airline cabin fit.'
      : 'Configurable reference geometry only; not an aircraft-specific cabin fit.',
  };
}

function validateZone(value: unknown, index: number): ZoneState {
  if (!isRecord(value) || typeof value.id !== 'string' || !ZONE_IDS.includes(value.id as ZoneId)) {
    throw new Error(`Zone ${index + 1} has an unknown zone ID.`);
  }
  const id = value.id as ZoneId;
  const name = requireText(value.name, `Zone ${id} name`, 80);
  const detail = requireText(value.detail, `Zone ${id} detail`, 160);
  if (typeof value.fadeSeconds !== 'number' || !Number.isFinite(value.fadeSeconds) || value.fadeSeconds < 0 || value.fadeSeconds > 30) {
    throw new Error(`Zone ${id} fade duration must be between 0 and 30 seconds.`);
  }
  if (!isRecord(value.rgbw)) throw new Error(`Zone ${id} needs RGBW channel values.`);
  const rgbw = {} as RGBW;
  for (const channel of ['r', 'g', 'b', 'w'] as const) {
    const amount = value.rgbw[channel];
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 100) {
      throw new Error(`Zone ${id} has an invalid ${channel.toUpperCase()} value.`);
    }
    rgbw[channel] = amount;
  }
  return { id, name, detail, rgbw, fadeSeconds: value.fadeSeconds };
}

/** Creates a self-contained offline scenario package with provenance derived from the checked-in profile. */
export function createScenarioPackage(input: ScenarioPackageInput): ScenarioPackage {
  return validateScenarioPackage({
    schemaVersion: 1,
    packageType: 'adigun-cabin-scenario',
    projectName: input.projectName,
    mode: 'SIMULATION',
    physicalOutputEnabled: false,
    cabin: { config: input.cabinConfig, profile: profileEvidence(input.cabinConfig) },
    zones: input.zones,
    scenes: input.scenes,
    activeSceneId: input.activeSceneId,
    masterIntensity: input.masterIntensity,
  });
}

/** Validates a serialized scenario package and rejects unsupported output or invented profile provenance. */
export function validateScenarioPackage(value: unknown): ScenarioPackage {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.packageType !== 'adigun-cabin-scenario') {
    throw new Error('Unsupported scenario package type or schema version.');
  }
  if (value.mode !== 'SIMULATION' || value.physicalOutputEnabled !== false) {
    throw new Error('Scenario packages must remain simulation-only with physical output disabled.');
  }
  const projectName = requireText(value.projectName, 'Project name', MAX_PROJECT_NAME_LENGTH);
  if (!isRecord(value.cabin)) throw new Error('Scenario package needs a cabin profile.');
  const config = requireConfig(value.cabin.config);
  const expectedProfile = profileEvidence(config);
  const actualProfile = value.cabin.profile;
  if (!isRecord(actualProfile) || actualProfile.id !== expectedProfile.id || actualProfile.name !== expectedProfile.name
    || actualProfile.sourceUrl !== expectedProfile.sourceUrl || actualProfile.evidenceStatus !== expectedProfile.evidenceStatus
    || actualProfile.limits !== expectedProfile.limits) {
    throw new Error('Cabin profile provenance does not match the checked-in profile source and limits.');
  }

  if (!Array.isArray(value.zones) || value.zones.length !== ZONE_IDS.length) {
    throw new Error(`Scenario package must contain exactly ${ZONE_IDS.length} cabin zones.`);
  }
  const zones = value.zones.map(validateZone);
  const zoneIds = zones.map((zone) => zone.id);
  if (new Set(zoneIds).size !== ZONE_IDS.length || ZONE_IDS.some((id) => !zoneIds.includes(id))) {
    throw new Error('Scenario package must include each cabin zone exactly once.');
  }
  if (!Array.isArray(value.scenes) || value.scenes.length === 0 || value.scenes.length > MAX_SCENARIO_SCENES) {
    throw new Error(`Scenario package must include 1–${MAX_SCENARIO_SCENES} scenes.`);
  }
  const scenes = value.scenes.map(validateSceneFile);
  const sceneIds = scenes.map((scene) => scene.id);
  if (new Set(sceneIds).size !== sceneIds.length) throw new Error('Scenario scene IDs must be unique.');
  const activeSceneId = requireText(value.activeSceneId, 'Active scene ID', 80);
  if (!sceneIds.includes(activeSceneId)) throw new Error('Active scene ID must match a scene in this package.');
  if (typeof value.masterIntensity !== 'number' || !Number.isFinite(value.masterIntensity) || value.masterIntensity < 0 || value.masterIntensity > 100) {
    throw new Error('Master intensity must be between 0 and 100.');
  }

  const scenario: ScenarioPackage = {
    schemaVersion: 1,
    packageType: 'adigun-cabin-scenario',
    projectName,
    mode: 'SIMULATION',
    physicalOutputEnabled: false,
    cabin: { config, profile: expectedProfile },
    zones,
    scenes,
    activeSceneId,
    masterIntensity: value.masterIntensity,
  };
  if (new TextEncoder().encode(JSON.stringify(scenario)).byteLength > MAX_SCENARIO_PACKAGE_BYTES) {
    throw new Error('Scenario package exceeds the 64 KiB review limit.');
  }
  return scenario;
}

export function reviewScenarioPackage(value: unknown): ScenarioReviewReport {
  const scenario = validateScenarioPackage(value);
  return {
    status: 'valid',
    mode: 'SIMULATION',
    physicalOutputEnabled: false,
    projectName: scenario.projectName,
    cabinProfile: scenario.cabin.profile,
    sceneCount: scenario.scenes.length,
    sceneIds: scenario.scenes.map((scene) => scene.id),
    activeSceneId: scenario.activeSceneId,
    zoneCount: scenario.zones.length,
    fixtureCoverage: fixtureCoverageForZones(ZONE_IDS),
    limits: [
      'Cabin layout and lighting scenes are separate package fields; changing the cabin profile does not rewrite scene keyframes.',
      'Sourced profile data is planning-reference provenance only; the rendered cabin geometry is not an airline fit.',
      'Fixture identity, installed coordinates, and photometric behavior remain missing from this package.',
      'This is an offline schema review, not an operator approval, OEM validation, hardware command, or immutable audit record.',
    ],
  };
}

export function createDefaultScenario(projectName: string, layoutId: CabinLayoutId, activeSceneId: string, scenes: readonly SceneFile[], masterIntensity = 72): ScenarioPackage {
  return createScenarioPackage({
    projectName,
    cabinConfig: CABIN_PROFILES[layoutId],
    zones: makeDefaultZones(),
    scenes,
    activeSceneId,
    masterIntensity,
  });
}

