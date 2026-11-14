import { validateSceneFile, ZONE_IDS, type RGBW, type SceneEasing, type SceneFile, type ZoneId } from '../src/scene-engine.js';

type Channel = keyof RGBW;
type MetadataField = 'id' | 'name' | 'durationSeconds';

export interface SceneTargetChange {
  readonly zoneId: ZoneId;
  readonly channel: Channel;
  readonly before: number | null;
  readonly after: number | null;
}

export interface SceneKeyframeDiff {
  readonly atSeconds: number;
  readonly kind: 'added' | 'removed' | 'modified';
  readonly targets: readonly SceneTargetChange[];
  readonly easingChange?: { readonly before: SceneEasing | null; readonly after: SceneEasing | null };
}

export interface SceneDiffReport {
  readonly status: 'unchanged' | 'changes-found';
  readonly mode: 'SIMULATION';
  readonly physicalOutputEnabled: false;
  readonly comparisonScope: 'SCHEMA_VALIDATED_KEYFRAME_DATA';
  readonly baseline: { readonly id: string; readonly name: string; readonly durationSeconds: number; readonly keyframeCount: number };
  readonly proposed: { readonly id: string; readonly name: string; readonly durationSeconds: number; readonly keyframeCount: number };
  readonly metadataChanges: readonly { readonly field: MetadataField; readonly before: string | number; readonly after: string | number }[];
  readonly keyframeChanges: readonly SceneKeyframeDiff[];
  readonly summary: { readonly addedKeyframes: number; readonly removedKeyframes: number; readonly modifiedKeyframes: number; readonly changedTargets: number };
  readonly easingChanges: number;
  readonly limits: readonly string[];
}

function parseScene(value: unknown): SceneFile {
  let jsonValue: unknown;
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== 'string') throw new Error('Scene input must be JSON-serializable.');
    jsonValue = JSON.parse(serialized) as unknown;
  } catch {
    throw new Error('Scene input must be JSON-serializable.');
  }
  return validateSceneFile(jsonValue);
}

function describe(scene: SceneFile) {
  return { id: scene.id, name: scene.name, durationSeconds: scene.durationSeconds, keyframeCount: scene.keyframes.length };
}

/** Compares validated explicit scene metadata and keyframes without mutating either input. */
export function diffScenes(baselineValue: unknown, proposedValue: unknown): SceneDiffReport {
  const baseline = parseScene(baselineValue);
  const proposed = parseScene(proposedValue);
  const metadataChanges: { field: MetadataField; before: string | number; after: string | number }[] = [];
  for (const field of ['id', 'name', 'durationSeconds'] as const) {
    if (baseline[field] !== proposed[field]) metadataChanges.push({ field, before: baseline[field], after: proposed[field] });
  }

  const baselineByTime = new Map(baseline.keyframes.map((frame) => [frame.atSeconds, frame]));
  const proposedByTime = new Map(proposed.keyframes.map((frame) => [frame.atSeconds, frame]));
  const times = [...new Set([...baselineByTime.keys(), ...proposedByTime.keys()])].sort((a, b) => a - b);
  const channels: Channel[] = ['r', 'g', 'b', 'w'];
  const keyframeChanges: SceneKeyframeDiff[] = [];

  for (const atSeconds of times) {
    const beforeFrame = baselineByTime.get(atSeconds);
    const afterFrame = proposedByTime.get(atSeconds);
    const targets: SceneTargetChange[] = [];
    const easingChange = beforeFrame && afterFrame && beforeFrame.easing !== afterFrame.easing
      ? { before: beforeFrame.easing ?? null, after: afterFrame.easing ?? null }
      : undefined;
    for (const zoneId of ZONE_IDS) {
      for (const channel of channels) {
        const before = beforeFrame?.targets[zoneId]?.[channel] ?? null;
        const after = afterFrame?.targets[zoneId]?.[channel] ?? null;
        if (before !== after) targets.push({ zoneId, channel, before, after });
      }
    }
    if (!targets.length && !easingChange) continue;
    keyframeChanges.push({ atSeconds, kind: !beforeFrame ? 'added' : !afterFrame ? 'removed' : 'modified', targets, ...(easingChange ? { easingChange } : {}) });
  }

  const addedKeyframes = keyframeChanges.filter((frame) => frame.kind === 'added').length;
  const removedKeyframes = keyframeChanges.filter((frame) => frame.kind === 'removed').length;
  const modifiedKeyframes = keyframeChanges.filter((frame) => frame.kind === 'modified').length;
  const changedTargets = keyframeChanges.reduce((total, frame) => total + frame.targets.length, 0);
  const changed = metadataChanges.length > 0 || keyframeChanges.length > 0;

  return {
    status: changed ? 'changes-found' : 'unchanged',
    mode: 'SIMULATION',
    physicalOutputEnabled: false,
    comparisonScope: 'SCHEMA_VALIDATED_KEYFRAME_DATA',
    baseline: describe(baseline),
    proposed: describe(proposed),
    metadataChanges,
    keyframeChanges,
    summary: { addedKeyframes, removedKeyframes, modifiedKeyframes, changedTargets },
    easingChanges: keyframeChanges.filter((frame) => frame.easingChange !== undefined).length,
    limits: [
      'Both inputs passed scene schema validation; no cabin-fit, OEM, electrical, role, or hardware checks were performed.',
      'The report compares explicit keyframe data and does not sample interpolated output between keyframes.',
      'This is an offline review; no gateway or device command was sent and no physical output was enabled.',
    ],
  };
}

