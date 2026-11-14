import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { inspectStaticRelease } from './check-static-release.mjs';

async function withRelease(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'adigun-static-release-'));
  try {
    await writeFile(path.join(root, 'index.html'), '<!doctype html><title>Studio</title>');
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('accepts a static browser release without gateway source or credentials', async () => {
  await withRelease(async (root) => {
    await mkdir(path.join(root, 'assets'));
    await writeFile(path.join(root, 'assets', 'app.js'), 'const mode = "SIMULATION";');
    assert.deepEqual(await inspectStaticRelease(root), []);
  });
});

test('reports gateway source and credential patterns without printing matched values', async () => {
  await withRelease(async (root) => {
    const secret = 'ghp_' + 'a'.repeat(36);
    await writeFile(path.join(root, 'bundle.js'), `const token = "${secret}"; startGateway();`);
    const findings = await inspectStaticRelease(root);
    assert.deepEqual(findings, [
      { file: 'bundle.js', code: 'gateway-source' },
      { file: 'bundle.js', code: 'credential-pattern' },
    ]);
    assert.equal(JSON.stringify(findings).includes(secret), false);
  });
});

test('fails when the published root page is missing', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'adigun-static-release-empty-'));
  try {
    await assert.rejects(inspectStaticRelease(root), /missing index\.html/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('fails closed on symbolic links in the release directory', async () => {
  await withRelease(async (root) => {
    const target = path.join(root, 'outside.txt');
    await writeFile(target, 'outside');
    await import('node:fs/promises').then(({ symlink }) => symlink(target, path.join(root, 'linked.txt')));
    await assert.rejects(inspectStaticRelease(root), /contains a symlink/);
  });
});

