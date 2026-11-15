import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PRESETS } from '../src/scene-engine.js';
import { createSignedSceneReceipt, verifySignedSceneReceipt } from './signed-scene-receipt.js';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

describe('signed operator scene receipt', () => {
  it('signs and verifies the exact scene bytes without claiming identity or approval', () => {
    const scene = PRESETS.find((item) => item.id === 'rest');
    const source = Buffer.from(JSON.stringify(scene, null, 2));
    const receipt = createSignedSceneReceipt(source, privatePem);
    const receiptBytes = Buffer.from(JSON.stringify(receipt, null, 2));

    expect(receipt).toMatchObject({
      receiptVersion: 2,
      evidenceClass: 'SIGNED_INTEGRITY_FINGERPRINT_ONLY',
      authorization: { operatorIdentityRecorded: false, approvalRecorded: false, signaturePresent: true },
      signature: { algorithm: 'Ed25519' },
    });
    expect(verifySignedSceneReceipt(source, receiptBytes, publicPem)).toMatchObject({
      status: 'valid',
      evidenceClass: 'SIGNED_INTEGRITY_FINGERPRINT_ONLY',
    });
  });

  it('rejects changed scene bytes, tampered receipt data, and an untrusted key', () => {
    const scene = PRESETS.find((item) => item.id === 'rest');
    const source = Buffer.from(JSON.stringify(scene));
    const receipt = createSignedSceneReceipt(source, privatePem);
    const receiptBytes = Buffer.from(JSON.stringify(receipt));

    expect(() => verifySignedSceneReceipt(Buffer.from(`${source.toString()} `), receiptBytes, publicPem)).toThrow(/does not match/);
    const tampered = { ...receipt, scene: { ...receipt.scene, name: 'Altered scene' } };
    expect(() => verifySignedSceneReceipt(source, Buffer.from(JSON.stringify(tampered)), publicPem)).toThrow(/does not match/);
    const otherPublicKey = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
    expect(() => verifySignedSceneReceipt(source, receiptBytes, otherPublicKey)).toThrow(/fingerprint does not match/);
  });

  it('rejects non-Ed25519 keys and oversized receipts', () => {
    const scene = PRESETS.find((item) => item.id === 'rest');
    const source = Buffer.from(JSON.stringify(scene));
    const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
    expect(() => createSignedSceneReceipt(source, rsa.privateKey.export({ type: 'pkcs8', format: 'pem' }))).toThrow(/Ed25519/);
    expect(() => verifySignedSceneReceipt(source, Buffer.alloc(65 * 1024), publicPem)).toThrow(/64 KiB/);
  });
});

