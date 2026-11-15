import { startGateway } from '../dist-gateway/gateway/server.js';
import { installGracefulShutdown } from '../dist-gateway/gateway/shutdown.js';
import { loadGatewayToken } from '../dist-gateway/gateway/credentials.js';

const token = await loadGatewayToken(process.env);
const port = Number(process.env.ADIGUN_GATEWAY_PORT ?? 4510);
const server = await startGateway(token, port);
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Gateway did not expose a TCP address.');
console.log(`SIMULATION gateway listening on http://127.0.0.1:${address.port}; no hardware output is enabled.`);
installGracefulShutdown(server);

