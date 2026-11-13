import { open } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { resolve } from 'node:path';
import process from 'node:process';
import { TextDecoder } from 'node:util';
import { reviewScene } from '../dist-gateway/operator/scene-review.js';

const MAX_SCENE_BYTES = 64 * 1024;
const [inputPath, ...extraArgs] = process.argv.slice(2);

function fail(code, message, exitCode = 1) {
  process.stderr.write(`${JSON.stringify({ status: 'invalid', mode: 'SIMULATION', code, message, physicalOutputEnabled: false })}\n`);
  process.exitCode = exitCode;
}

async function readBoundedFile(path) {
  const handle = await open(resolve(path), 'r');
  try {
    const bytes = Buffer.alloc(MAX_SCENE_BYTES + 1);
    let total = 0;
    while (total < bytes.length) {
      const { bytesRead } = await handle.read(bytes, total, bytes.length - total, total);
      if (bytesRead === 0) break;
      total += bytesRead;
    }
    if (total > MAX_SCENE_BYTES) throw Object.assign(new Error('Scene file exceeds 64 KiB.'), { code: 'FILE_TOO_LARGE' });
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, total));
  } finally {
    await handle.close();
  }
}

if (!inputPath || extraArgs.length > 0) {
  fail('USAGE', 'Usage: npm run operator:validate-scene -- <exported-scene.json>', 2);
} else {
  try {
    const text = await readBoundedFile(inputPath);
    let input;
    try {
      input = JSON.parse(text);
    } catch {
      throw Object.assign(new Error('Scene file is not valid JSON.'), { code: 'INVALID_JSON' });
    }
    const report = reviewScene(input);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    const code = error?.code === 'FILE_TOO_LARGE' ? 'FILE_TOO_LARGE'
      : error instanceof TypeError ? 'INVALID_UTF8'
        : error?.code === 'ENOENT' ? 'FILE_NOT_FOUND'
          : error?.code === 'INVALID_JSON' ? 'INVALID_JSON'
            : 'SCENE_INVALID';
    const message = code === 'FILE_NOT_FOUND' ? 'Scene file was not found.'
      : code === 'INVALID_UTF8' ? 'Scene file is not valid UTF-8.'
        : code === 'FILE_TOO_LARGE' ? 'Scene file exceeds 64 KiB.'
          : code === 'SCENE_INVALID' && error instanceof Error ? error.message
            : 'Scene preflight failed.';
    fail(code, message);
  }
}
