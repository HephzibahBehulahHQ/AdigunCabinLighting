import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readSceneJson, SceneFileReadError } from './scene-file.js';

let directory = '';

async function createFile(bytes: string | Uint8Array) {
  directory = await mkdtemp(join(tmpdir(), 'adigun-scene-file-'));
  const path = join(directory, 'scene.json');
  await writeFile(path, bytes);
  return path;
}

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = '';
});

describe('bounded operator scene file reader', () => {
  it('reads valid UTF-8 JSON', async () => {
    const path = await createFile('{"scene":true}');
    await expect(readSceneJson(path)).resolves.toEqual({ scene: true });
  });

  it('rejects files larger than 64 KiB', async () => {
    const path = await createFile(new Uint8Array(64 * 1024 + 1));
    await expect(readSceneJson(path)).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('rejects malformed UTF-8, malformed JSON, and missing files with stable codes', async () => {
    const invalidUtf8 = await createFile(new Uint8Array([0xc3, 0x28]));
    await expect(readSceneJson(invalidUtf8)).rejects.toMatchObject({ code: 'INVALID_UTF8' });
    const invalidJson = await createFile('{');
    await expect(readSceneJson(invalidJson)).rejects.toMatchObject({ code: 'INVALID_JSON' });
    await expect(readSceneJson(join(directory, 'missing.json'))).rejects.toBeInstanceOf(SceneFileReadError);
    await expect(readSceneJson(join(directory, 'missing.json'))).rejects.toMatchObject({ code: 'FILE_NOT_FOUND' });
  });
});

