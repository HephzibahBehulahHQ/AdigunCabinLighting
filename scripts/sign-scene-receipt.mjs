import { createPrivateKey } from 'node:crypto';
import { open, readFile, stat } from 'node:fs/promises';
import process from 'node:process';
import { createSignedSceneReceipt } from '../dist-gateway/operator/signed-scene-receipt.js';
import { readSceneDocument, SceneFileReadError } from '../dist-gateway/operator/scene-file.js';

const [inputPath, privateKeyPath, outputPath, ...extraArgs] = process.argv.slice(2);
const MAX_KEY_FILE_BYTES = 16 * 1024;

function fail(code, message, exitCode = 1) {
  process.stderr.write(`${JSON.stringify({ status: 'invalid', mode: 'SIMULATION', code, message, physicalOutputEnabled: false })}\n`);
  process.exitCode = exitCode;
}

async function readKey(path) {
  const metadata = await stat(path);
  if (!metadata.isFile() || metadata.size > MAX_KEY_FILE_BYTES) throw new Error('Operator key must be a regular file no larger than 16 KiB.');
  const bytes = await readFile(path);
  if (bytes.byteLength > MAX_KEY_FILE_BYTES) throw new Error('Operator key must be a regular file no larger than 16 KiB.');
  return bytes;
}

if (!inputPath || !privateKeyPath || !outputPath || extraArgs.length > 0) {
  fail('USAGE', 'Usage: npm run operator:sign-scene -- <scene.json> <private-key.pem> <receipt-output.json>', 2);
} else {
  try {
    const document = await readSceneDocument(inputPath);
    const privateKeyBytes = await readKey(privateKeyPath);
    createPrivateKey(privateKeyBytes);
    const receipt = createSignedSceneReceipt(document.rawBytes, privateKeyBytes);
    const output = await open(outputPath, 'wx', 0o600);
    try {
      await output.writeFile(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    } finally {
      await output.close();
    }
    process.stdout.write(`${JSON.stringify({ status: 'valid', mode: 'SIMULATION', receiptVersion: 2, evidenceClass: receipt.evidenceClass, sha256: receipt.artifact.sha256, signatureAlgorithm: receipt.signature.algorithm, publicKeyFingerprintSha256: receipt.signature.publicKeyFingerprintSha256, operatorIdentityRecorded: false, approvalRecorded: false, physicalOutputEnabled: false })}\n`);
  } catch (error) {
    const code = error instanceof SceneFileReadError ? error.code : 'SIGNATURE_FAILED';
    const message = error instanceof Error ? error.message : 'Scene receipt signing failed.';
    fail(code, message);
  }
}

