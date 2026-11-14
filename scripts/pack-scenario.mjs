import process from 'node:process';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createDefaultScenario, validateScenarioPackageRequest } from '../dist-gateway/operator/scenario-package.js';
import { readSceneJson, SceneFileReadError } from '../dist-gateway/operator/scene-file.js';

const [requestPath, ...extraArgs] = process.argv.slice(2);

function fail(code, message, exitCode = 1) {
  process.stderr.write(`${JSON.stringify({ status: 'invalid', mode: 'SIMULATION', code, message, physicalOutputEnabled: false })}\n`);
  process.exitCode = exitCode;
}

if (!requestPath || extraArgs.length > 0) {
  fail('USAGE', 'Usage: npm run operator:pack-scenario -- <scenario-request.json>', 2);
} else {
  try {
    const absoluteRequestPath = resolve(requestPath);
    const baseDirectory = dirname(absoluteRequestPath);
    const request = validateScenarioPackageRequest(await readSceneJson(absoluteRequestPath));
    const scenes = await Promise.all(request.sceneFiles.map((path) => readSceneJson(resolve(baseDirectory, path))));
    const scenario = createDefaultScenario(request.projectName, request.cabinLayoutId, request.activeSceneId, scenes, request.masterIntensity);
    const outputPath = resolve(baseDirectory, request.outputPath);
    await writeFile(outputPath, `${JSON.stringify(scenario, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    process.stdout.write(`${JSON.stringify({ status: 'created', mode: scenario.mode, path: outputPath, sceneCount: scenario.scenes.length, physicalOutputEnabled: false })}\n`);
  } catch (error) {
    const code = error instanceof SceneFileReadError ? error.code : 'SCENARIO_INVALID';
    const message = error instanceof Error ? error.message : 'Scenario package could not be created.';
    fail(code, message);
  }
}

