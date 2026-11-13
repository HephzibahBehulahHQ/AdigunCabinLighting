import { startGateway } from '../dist-gateway/gateway/server.js';

const token = process.env.ADIGUN_GATEWAY_TOKEN;
if (!token) {
  console.error('Set ADIGUN_GATEWAY_TOKEN to a randomly generated secret of at least 32 bytes.');
  process.exit(1);
}
const port = Number(process.env.ADIGUN_GATEWAY_PORT ?? 4510);
const server = await startGateway(token, port);
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Gateway did not expose a TCP address.');
console.log(`SIMULATION gateway listening on http://127.0.0.1:${address.port}; no hardware output is enabled.`);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
