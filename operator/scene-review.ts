import { ZONE_IDS, validateSceneFile, type SceneFile } from '../src/scene-engine.js';

export interface SceneReviewReport {
  readonly status: 'valid';
  readonly mode: 'SIMULATION';
  readonly hardwareConnected: false;
  readonly physicalOutputEnabled: false;
  readonly validationScope: 'SCHEMA_ONLY';
  readonly scene: {
    readonly id: string;
    readonly name: string;
    readonly schemaVersion: 1;
    readonly durationSeconds: number;
    readonly keyframeCount: number;
    readonly zoneIds: readonly string[];
  };
  readonly limits: readonly string[];
}

/** Validates a saved scene against the same schema used by the offline simulator. */
export function reviewScene(value: unknown): SceneReviewReport {
  const scene: SceneFile = validateSceneFile(value);
  return {
    status: 'valid',
    mode: 'SIMULATION',
    hardwareConnected: false,
    physicalOutputEnabled: false,
    validationScope: 'SCHEMA_ONLY',
    scene: {
      id: scene.id,
      name: scene.name,
      schemaVersion: scene.schemaVersion,
      durationSeconds: scene.durationSeconds,
      keyframeCount: scene.keyframes.length,
      zoneIds: [...ZONE_IDS],
    },
    limits: [
      'This report validates the scene-file schema only.',
      'It does not validate an aircraft cabin fit, OEM limits, electrical safety, or hardware behavior.',
      'No scene command was sent and no physical output was enabled.',
    ],
  };
}
