import { createPublicKey } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import process from 'node:process';
import { verifySignedSceneReceipt } from '../dist-gateway/operator/signed-scene-receipt.js';
import { MAX_SCENE_FILE_BYTES, readSceneDocument, SceneFileReadError } from '../dist-gateway/operator/scene-file.js';

const [inputPath, receiptPath, publicKeyPath, ...extraArgs] = process.argv.slice(2);
const MAX_KEY_FILE_BYTES = 16 * 1024;

function fail(code, message, exitCode = 1) {
  process.stderr.write(`${JSON.stringify({ status: 'invalid', mode: 'SIMULATION', code, message, physicalOutputEnabled: false })}\n`);
  process.exitCode = exitCode;
}

async function readBoundedFile(path, maxBytes, label) {
  const metadata = await stat(path);
  if (!metadata.isFile() || metadata.size > maxBytes) throw new Error(`${label} must be a regular file no larger than ${maxBytes} bytes.`);
  const bytes = await readFile(path);
  if (bytes.byteLength > maxBytes) throw new Error(`${label} must be a regular file no larger than ${maxBytes} bytes.`);
  return bytes;
}

if (!inputPath || !receiptPath || !publicKeyPath || extraArgs.length > 0) {
  fail('USAGE', 'Usage: npm run operator:verify-scene-receipt -- <scene.json> <signed-receipt.json> <public-key.pem>', 2);
} else {
  try {
    const scene = await readSceneDocument(inputPath);
    const receiptBytes = await readBoundedFile(receiptPath, MAX_SCENE_FILE_BYTES, 'Signed receipt');
    const publicKeyBytes = await readBoundedFile(publicKeyPath, MAX_KEY_FILE_BYTES, 'Operator public key');
    createPublicKey(publicKeyBytes);
    const result = verifySignedSceneReceipt(scene.rawBytes, receiptBytes, publicKeyBytes);
    process.stdout.write(`${JSON.stringify({ ...result, mode: 'SIMULATION', operatorIdentityRecorded: false, approvalRecorded: false, physicalOutputEnabled: false })}\n`);
  } catch (error) {
    const code = error instanceof SceneFileReadError ? error.code : 'SIGNATURE_INVALID';
    const message = error instanceof Error ? error.message : 'Scene receipt verification failed.';
    fail(code, message);
  }
}

