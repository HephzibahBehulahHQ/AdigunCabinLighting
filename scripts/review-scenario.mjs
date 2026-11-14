import process from 'node:process';
import { reviewScenarioPackage } from '../dist-gateway/operator/scenario-package.js';
import { readSceneJson, SceneFileReadError } from '../dist-gateway/operator/scene-file.js';

const [inputPath, ...extraArgs] = process.argv.slice(2);

function fail(code, message, exitCode = 1) {
  process.stderr.write(`${JSON.stringify({ status: 'invalid', mode: 'SIMULATION', code, message, physicalOutputEnabled: false })}\n`);
  process.exitCode = exitCode;
}

if (!inputPath || extraArgs.length > 0) {
  fail('USAGE', 'Usage: npm run operator:review-scenario -- <scenario-package.json>', 2);
} else {
  try {
    process.stdout.write(`${JSON.stringify(reviewScenarioPackage(await readSceneJson(inputPath)), null, 2)}\n`);
  } catch (error) {
    const code = error instanceof SceneFileReadError ? error.code : 'SCENARIO_INVALID';
    const message = error instanceof Error ? error.message : 'Scenario review failed.';
    fail(code, message);
  }
}

