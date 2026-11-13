import process from 'node:process';
import { reviewScene } from '../dist-gateway/operator/scene-review.js';
import { readSceneJson, SceneFileReadError } from '../dist-gateway/operator/scene-file.js';
const [inputPath, ...extraArgs] = process.argv.slice(2);

function fail(code, message, exitCode = 1) {
  process.stderr.write(`${JSON.stringify({ status: 'invalid', mode: 'SIMULATION', code, message, physicalOutputEnabled: false })}\n`);
  process.exitCode = exitCode;
}

if (!inputPath || extraArgs.length > 0) {
  fail('USAGE', 'Usage: npm run operator:validate-scene -- <exported-scene.json>', 2);
} else {
  try {
    const input = await readSceneJson(inputPath);
    const report = reviewScene(input);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    const code = error instanceof SceneFileReadError ? error.code : 'SCENE_INVALID';
    const message = error instanceof Error ? error.message : 'Scene preflight failed.';
    fail(code, message);
  }
}

