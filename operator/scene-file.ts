import { Buffer } from 'node:buffer';
import { open, type FileHandle } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TextDecoder } from 'node:util';

export const MAX_SCENE_FILE_BYTES = 64 * 1024;
export type SceneFileReadErrorCode = 'FILE_NOT_FOUND' | 'FILE_TOO_LARGE' | 'INVALID_UTF8' | 'INVALID_JSON' | 'READ_FAILED';

export class SceneFileReadError extends Error {
  constructor(readonly code: SceneFileReadErrorCode, message: string) {
    super(message);
    this.name = 'SceneFileReadError';
  }
}

/** Reads a bounded UTF-8 JSON file without modifying its contents. */
export async function readSceneJson(path: string): Promise<unknown> {
  let handle: FileHandle;
  try {
    handle = await open(resolve(path), 'r');
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code === 'ENOENT') throw new SceneFileReadError('FILE_NOT_FOUND', 'Scene file was not found.');
    throw new SceneFileReadError('READ_FAILED', 'Scene file could not be opened.');
  }

  let text: string;
  try {
    const bytes = Buffer.alloc(MAX_SCENE_FILE_BYTES + 1);
    let total = 0;
    while (total < bytes.length) {
      const { bytesRead } = await handle.read(bytes, total, bytes.length - total, total);
      if (bytesRead === 0) break;
      total += bytesRead;
    }
    if (total > MAX_SCENE_FILE_BYTES) throw new SceneFileReadError('FILE_TOO_LARGE', 'Scene file exceeds 64 KiB.');
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, total));
    } catch {
      throw new SceneFileReadError('INVALID_UTF8', 'Scene file is not valid UTF-8.');
    }
  } catch (error) {
    if (error instanceof SceneFileReadError) throw error;
    throw new SceneFileReadError('READ_FAILED', 'Scene file could not be read.');
  } finally {
    await handle.close();
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SceneFileReadError('INVALID_JSON', 'Scene file is not valid JSON.');
  }
}

