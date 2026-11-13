import process from 'node:process';
import { createSceneReceipt } from '../dist-gateway/operator/scene-receipt.js';
import { readSceneDocument, SceneFileReadError } from '../dist-gateway/operator/scene-file.js';

const [inputPath, ...extraArgs] = process.argv.slice(2);

function fail(code, message, exitCode = 1) {
  process.stderr.write(`${JSON.stringify({ status: 'invalid', mode: 'SIMULATION', code, message, physicalOutputEnabled: false })}\n`);
  process.exitCode = exitCode;
}

if (!inputPath || extraArgs.length > 0) {
  fail('USAGE', 'Usage: npm run operator:receipt-scene -- <exported-scene.json>', 2);
} else {
  try {
    const document = await readSceneDocument(inputPath);
    process.stdout.write(`${JSON.stringify(createSceneReceipt(document.rawBytes), null, 2)}\n`);
  } catch (error) {
    const code = error instanceof SceneFileReadError ? error.code : 'SCENE_INVALID';
    const message = error instanceof Error ? error.message : 'Scene receipt failed.';
    fail(code, message);
  }
}
