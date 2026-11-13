import process from 'node:process';
import { diffScenes } from '../dist-gateway/operator/scene-diff.js';
import { readSceneJson, SceneFileReadError } from '../dist-gateway/operator/scene-file.js';

const [baselinePath, proposedPath, ...extraArgs] = process.argv.slice(2);

function fail(code, message, exitCode = 1) {
  process.stderr.write(`${JSON.stringify({ status: 'invalid', mode: 'SIMULATION', code, message, physicalOutputEnabled: false })}\n`);
  process.exitCode = exitCode;
}

if (!baselinePath || !proposedPath || extraArgs.length > 0) {
  fail('USAGE', 'Usage: npm run operator:diff-scenes -- <baseline-scene.json> <proposed-scene.json>', 2);
} else {
  try {
    const [baseline, proposed] = await Promise.all([readSceneJson(baselinePath), readSceneJson(proposedPath)]);
    process.stdout.write(`${JSON.stringify(diffScenes(baseline, proposed), null, 2)}\n`);
  } catch (error) {
    const code = error instanceof SceneFileReadError ? error.code : 'SCENE_INVALID';
    const message = error instanceof Error ? error.message : 'Scene diff failed.';
    fail(code, message);
  }
}

