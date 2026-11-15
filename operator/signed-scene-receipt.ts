import { createHash, createPrivateKey, createPublicKey, sign, verify, type KeyObject } from 'node:crypto';
import { isDeepStrictEqual, TextDecoder } from 'node:util';
import { MAX_SCENE_FILE_BYTES } from './scene-file.js';
import { createSceneReceipt, type SceneReceipt } from './scene-receipt.js';

export interface SignedSceneReceipt extends Omit<SceneReceipt, 'receiptVersion' | 'evidenceClass' | 'authorization'> {
  readonly receiptVersion: 2;
  readonly evidenceClass: 'SIGNED_INTEGRITY_FINGERPRINT_ONLY';
  readonly authorization: {
    readonly operatorIdentityRecorded: false;
    readonly approvalRecorded: false;
    readonly signaturePresent: true;
  };
  readonly signature: {
    readonly algorithm: 'Ed25519';
    readonly publicKeyFingerprintSha256: string;
    readonly signatureBase64: string;
  };
}

type SignedReceiptPayload = Omit<SignedSceneReceipt, 'signature'>;

function requireEd25519(key: KeyObject, label: string): void {
  if (key.asymmetricKeyType !== 'ed25519') throw new Error(`${label} must be an Ed25519 key.`);
}

function publicKeyFingerprint(key: KeyObject): string {
  const publicKey = key.type === 'private' ? createPublicKey(key) : key;
  requireEd25519(publicKey, 'Public key');
  return createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex');
}

function signedPayload(receipt: SceneReceipt): SignedReceiptPayload {
  return {
    ...receipt,
    receiptVersion: 2,
    evidenceClass: 'SIGNED_INTEGRITY_FINGERPRINT_ONLY',
    authorization: {
      operatorIdentityRecorded: false,
      approvalRecorded: false,
      signaturePresent: true,
    },
  };
}

/** Signs the deterministic scene receipt; the key proves possession only, not operator identity or approval. */
export function createSignedSceneReceipt(sourceBytes: Uint8Array, privateKeyPem: string | Uint8Array): SignedSceneReceipt {
  const key = createPrivateKey(typeof privateKeyPem === 'string' ? privateKeyPem : Buffer.from(privateKeyPem));
  requireEd25519(key, 'Private key');
  const payload = signedPayload(createSceneReceipt(sourceBytes));
  const signatureBytes = sign(null, Buffer.from(JSON.stringify(payload), 'utf8'), key);
  return {
    ...payload,
    signature: {
      algorithm: 'Ed25519',
      publicKeyFingerprintSha256: publicKeyFingerprint(key),
      signatureBase64: signatureBytes.toString('base64'),
    },
  };
}

/** Verifies the scene bytes, receipt fields, key fingerprint, and Ed25519 signature. */
export function verifySignedSceneReceipt(
  sourceBytes: Uint8Array,
  receiptBytes: Uint8Array,
  publicKeyPem: string | Uint8Array,
): { readonly status: 'valid'; readonly evidenceClass: SignedSceneReceipt['evidenceClass']; readonly publicKeyFingerprintSha256: string } {
  if (receiptBytes.byteLength > MAX_SCENE_FILE_BYTES) throw new Error('Signed receipt input exceeds 64 KiB.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(receiptBytes)) as unknown;
  } catch {
    throw new Error('Signed receipt must be valid UTF-8 JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Signed receipt must be a JSON object.');
  const record = parsed as Record<string, unknown>;
  const signature = record.signature;
  if (!signature || typeof signature !== 'object' || Array.isArray(signature)) throw new Error('Signed receipt signature is missing.');
  const signatureRecord = signature as Record<string, unknown>;
  if (Object.keys(signatureRecord).length !== 3 || signatureRecord.algorithm !== 'Ed25519' || typeof signatureRecord.publicKeyFingerprintSha256 !== 'string' || typeof signatureRecord.signatureBase64 !== 'string') {
    throw new Error('Signed receipt signature metadata is invalid.');
  }

  const providedPayload = { ...record };
  delete providedPayload.signature;
  const expectedPayload = signedPayload(createSceneReceipt(sourceBytes));
  if (!isDeepStrictEqual(providedPayload, expectedPayload)) throw new Error('Signed receipt does not match the supplied scene bytes.');

  const key = createPublicKey(typeof publicKeyPem === 'string' ? publicKeyPem : Buffer.from(publicKeyPem));
  requireEd25519(key, 'Public key');
  const fingerprint = publicKeyFingerprint(key);
  if (signatureRecord.publicKeyFingerprintSha256 !== fingerprint) throw new Error('Signed receipt public-key fingerprint does not match.');
  const encodedSignature = signatureRecord.signatureBase64;
  const signatureBytes = Buffer.from(encodedSignature, 'base64');
  if (!encodedSignature || signatureBytes.toString('base64') !== encodedSignature) throw new Error('Signed receipt signature encoding is invalid.');
  if (!verify(null, Buffer.from(JSON.stringify(expectedPayload), 'utf8'), key, signatureBytes)) throw new Error('Signed receipt signature verification failed.');

  return { status: 'valid', evidenceClass: expectedPayload.evidenceClass, publicKeyFingerprintSha256: fingerprint };
}

