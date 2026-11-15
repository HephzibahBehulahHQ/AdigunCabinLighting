import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const servicePath = fileURLToPath(new URL('../deploy/systemd/adigun-cabin-gateway.service', import.meta.url));

describe('systemd gateway service template', () => {
  it('uses a transient identity, systemd credentials, bounded restart, and hardened defaults', async () => {
    const service = await readFile(servicePath, 'utf8');
    for (const directive of [
      'DynamicUser=yes',
      'LoadCredential=adigun-gateway-token:/etc/adigun-cabin-lighting/gateway-token',
      'Restart=on-failure',
      'StartLimitBurst=3',
      'KillSignal=SIGTERM',
      'TimeoutStopSec=25s',
      'NoNewPrivileges=yes',
      'PrivateTmp=yes',
      'ProtectSystem=strict',
      'CapabilityBoundingSet=',
    ]) {
      expect(service).toContain(directive);
    }
    expect(service).not.toMatch(/0\.0\.0\.0|::0/);
  });
});
