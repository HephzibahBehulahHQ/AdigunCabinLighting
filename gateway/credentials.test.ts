import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadGatewayToken } from './credentials.js';

const TOKEN = '0123456789abcdef0123456789abcdef';

describe('gateway credential loading', () => {
  it('accepts the existing process-local token source', async () => {
    await expect(loadGatewayToken({ ADIGUN_GATEWAY_TOKEN: TOKEN })).resolves.toBe(TOKEN);
  });

  it('reads the named systemd credential without exposing its contents', async () => {
    const readCredential = vi.fn(async () => TOKEN);
    await expect(loadGatewayToken({ CREDENTIALS_DIRECTORY: '/run/credentials/adigun-gateway.service' }, readCredential)).resolves.toBe(TOKEN);
    expect(readCredential).toHaveBeenCalledOnce();
    expect(readCredential).toHaveBeenCalledWith(join('/run/credentials/adigun-gateway.service', 'adigun-gateway-token'));
  });

  it('loads the token from the actual systemd credential file path', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'adigun-gateway-credential-'));
    const credentialPath = join(directory, 'adigun-gateway-token');
    try {
      await writeFile(credentialPath, TOKEN, { mode: 0o600 });
      await expect(loadGatewayToken({ CREDENTIALS_DIRECTORY: directory })).resolves.toBe(TOKEN);
      await expect(readFile(credentialPath, 'utf8')).resolves.toBe(TOKEN);
    } finally {
      await rm(credentialPath, { force: true });
      await rmdir(directory);
    }
  });

  it('fails closed when no token source is configured', async () => {
    await expect(loadGatewayToken({})).rejects.toThrow(/Set ADIGUN_GATEWAY_TOKEN/);
  });

  it('rejects ambiguous token sources and weak tokens', async () => {
    await expect(loadGatewayToken({ ADIGUN_GATEWAY_TOKEN: TOKEN, CREDENTIALS_DIRECTORY: '/run/credentials' })).rejects.toThrow(/only one gateway token source/);
    await expect(loadGatewayToken({ ADIGUN_GATEWAY_TOKEN: 'short' })).rejects.toThrow(/at least 32 UTF-8 bytes/);
    await expect(loadGatewayToken({ CREDENTIALS_DIRECTORY: '/run/credentials' }, async () => 'short')).rejects.toThrow(/at least 32 UTF-8 bytes/);
  });
});
