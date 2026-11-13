import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { ZONE_IDS, validateSceneFile } from '../src/scene-engine.js';
import { MAX_SCENE_FILE_BYTES } from './scene-file.js';

export interface SceneReceipt {
  readonly receiptVersion: 1;
  readonly evidenceClass: 'INTEGRITY_FINGERPRINT_ONLY';
  readonly mode: 'SIMULATION';
  readonly status: 'valid';
  readonly validationScope: 'SCHEMA_ONLY';
  readonly hardwareConnected: false;
  readonly physicalOutputEnabled: false;
  readonly artifact: {
    readonly encoding: 'UTF-8 JSON';
    readonly byteLength: number;
    readonly sha256: string;
  };
  readonly scene: {
    readonly id: string;
    readonly name: string;
    readonly schemaVersion: 1;
    readonly durationSeconds: number;
    readonly keyframeCount: number;
    readonly zoneIds: readonly string[];
  };
  readonly authorization: {
    readonly operatorIdentityRecorded: false;
    readonly approvalRecorded: false;
    readonly signaturePresent: false;
  };
  readonly limits: readonly string[];
}

/** Builds deterministic schema/integrity evidence from one bounded scene document. */
export function createSceneReceipt(sourceBytes: Uint8Array): SceneReceipt {
  if (sourceBytes.byteLength > MAX_SCENE_FILE_BYTES) throw new Error('Scene receipt input exceeds 64 KiB.');
  const rawBytes = Buffer.from(sourceBytes);
  const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawBytes)) as unknown;
  const scene = validateSceneFile(value);
  const digest = createHash('sha256').update(rawBytes).digest('hex');

  return {
    receiptVersion: 1,
    evidenceClass: 'INTEGRITY_FINGERPRINT_ONLY',
    mode: 'SIMULATION',
    status: 'valid',
    validationScope: 'SCHEMA_ONLY',
    hardwareConnected: false,
    physicalOutputEnabled: false,
    artifact: {
      encoding: 'UTF-8 JSON',
      byteLength: rawBytes.byteLength,
      sha256: digest,
    },
    scene: {
      id: scene.id,
      name: scene.name,
      schemaVersion: scene.schemaVersion,
      durationSeconds: scene.durationSeconds,
      keyframeCount: scene.keyframes.length,
      zoneIds: [...ZONE_IDS],
    },
    authorization: {
      operatorIdentityRecorded: false,
      approvalRecorded: false,
      signaturePresent: false,
    },
    limits: [
      'The SHA-256 fingerprint identifies the exact source bytes read; changing whitespace or line endings changes the fingerprint.',
      'This receipt records schema validation and artifact integrity only; it is not an operator identity, approval, digital signature, or immutable audit log.',
      'It does not validate aircraft fit, OEM limits, electrical safety, or hardware behavior; no command was sent and no physical output was enabled.',
    ],
  };
}
