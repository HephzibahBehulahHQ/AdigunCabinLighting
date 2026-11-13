import { afterEach, describe, expect, it } from 'vitest';
import { PRESETS } from '../src/scene-engine.js';
import { createGatewayServer } from './server.js';

const TOKEN = 'local-test-token-1234567890-abcdef';
const servers: ReturnType<typeof createGatewayServer>[] = [];

async function openGateway() {
  const server = createGatewayServer(TOKEN);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test gateway failed to bind.');
  return { base: `http://127.0.0.1:${address.port}`, headers: { authorization: `Bearer ${TOKEN}` } };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
});

describe('loopback simulator gateway', () => {
  it('requires a strong token and binds only to loopback', async () => {
    expect(() => createGatewayServer('short')).toThrow(/32 UTF-8 bytes/);
    const gateway = await openGateway();
    const result = await fetch(`${gateway.base}/v1/health`, { headers: gateway.headers });
    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toMatchObject({ mode: 'SIMULATION', hardwareConnected: false, physicalOutputEnabled: false });
  });

  it('rejects missing or incorrect authorization', async () => {
    const gateway = await openGateway();
    const response = await fetch(`${gateway.base}/v1/capabilities`);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'UNAUTHORIZED' } });
  });

  it('previews validated scene targets deterministically without output capability', async () => {
    const gateway = await openGateway();
    const response = await fetch(`${gateway.base}/v1/preview`, {
      method: 'POST', headers: { ...gateway.headers, 'content-type': 'application/json' },
      body: JSON.stringify({ scene: PRESETS[0], timeSeconds: 22.5 }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ mode: 'SIMULATION', physicalOutputEnabled: false, sceneId: 'boarding', timeSeconds: 22.5, targets: { ceiling: { r: 13.5 } } });
  });

  it('rejects an invalid scene and an out-of-range preview time', async () => {
    const gateway = await openGateway();
    const request = (scene: unknown, timeSeconds: number) => fetch(`${gateway.base}/v1/preview`, {
      method: 'POST', headers: { ...gateway.headers, 'content-type': 'application/json' }, body: JSON.stringify({ scene, timeSeconds }),
    });
    expect((await request({ schemaVersion: 99 }, 0)).status).toBe(422);
    expect((await request(PRESETS[0], 46)).status).toBe(422);
  });
});
