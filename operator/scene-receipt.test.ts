import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PRESETS } from '../src/scene-engine.js';
import { createSceneReceipt } from './scene-receipt.js';

describe('operator scene receipt', () => {
  it('binds schema review to the exact source bytes and remains deterministic', () => {
    const scene = PRESETS.find((item) => item.id === 'rest');
    const rawBytes = Buffer.from(JSON.stringify(scene, null, 2));
    const receipt = createSceneReceipt(rawBytes);

    expect(receipt).toEqual(createSceneReceipt(rawBytes));
    expect(receipt).toMatchObject({
      evidenceClass: 'INTEGRITY_FINGERPRINT_ONLY',
      mode: 'SIMULATION',
      status: 'valid',
      hardwareConnected: false,
      physicalOutputEnabled: false,
      authorization: { operatorIdentityRecorded: false, approvalRecorded: false, signaturePresent: false },
    });
    expect(receipt.artifact).toEqual({
      encoding: 'UTF-8 JSON',
      byteLength: rawBytes.byteLength,
      sha256: createHash('sha256').update(rawBytes).digest('hex'),
    });
  });

  it('fingerprints formatting changes even when the validated scene is equivalent', () => {
    const scene = PRESETS.find((item) => item.id === 'rest');
    const compact = Buffer.from(JSON.stringify(scene));
    const pretty = Buffer.from(JSON.stringify(scene, null, 2));
    const compactReceipt = createSceneReceipt(compact);
    const prettyReceipt = createSceneReceipt(pretty);

    expect(compactReceipt.scene).toEqual(prettyReceipt.scene);
    expect(compactReceipt.artifact.sha256).not.toBe(prettyReceipt.artifact.sha256);
  });

  it('rejects invalid scene schemas rather than issuing a valid receipt', () => {
    const invalidScene = { schemaVersion: 99 };
    const rawBytes = Buffer.from(JSON.stringify(invalidScene));
    expect(() => createSceneReceipt(rawBytes)).toThrow(/schema version/i);
  });
});
