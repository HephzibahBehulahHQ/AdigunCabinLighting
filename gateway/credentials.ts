import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type GatewayEnvironment = Readonly<Record<string, string | undefined>>;
export type CredentialReader = (path: string) => Promise<string>;

const readCredential: CredentialReader = (path) => readFile(path, 'utf8');

/** Load one strong simulator token from an environment value or a systemd credential file. */
export async function loadGatewayToken(
  environment: GatewayEnvironment = process.env,
  readFileContents: CredentialReader = readCredential,
): Promise<string> {
  const environmentToken = environment.ADIGUN_GATEWAY_TOKEN;
  const credentialDirectory = environment.CREDENTIALS_DIRECTORY;
  if (environmentToken && credentialDirectory) {
    throw new Error('Configure only one gateway token source: ADIGUN_GATEWAY_TOKEN or a systemd credential.');
  }

  let token = environmentToken;
  if (!token && credentialDirectory) {
    token = await readFileContents(join(credentialDirectory, 'adigun-gateway-token'));
  }
  if (!token) throw new Error('Set ADIGUN_GATEWAY_TOKEN or provide the adigun-gateway-token systemd credential.');
  if (Buffer.byteLength(token, 'utf8') < 32) throw new Error('Gateway token must contain at least 32 UTF-8 bytes.');
  return token;
}
