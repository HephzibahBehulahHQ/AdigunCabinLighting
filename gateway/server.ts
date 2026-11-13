import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { interpolateScene, validateSceneFile, type SceneFile } from '../src/scene-engine.js';

const API_VERSION = '1';
const MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_RATE_LIMIT = 120;
const DEFAULT_RATE_WINDOW_MS = 60_000;

type RateBucket = { startedAt: number; requests: number };

type GatewayFault = Error & { statusCode: number; code: string };

function fault(statusCode: number, code: string, message: string): GatewayFault {
  return Object.assign(new Error(message), { statusCode, code });
}

function send(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  });
  response.end(JSON.stringify(payload));
}

function isLoopbackHost(header: string | undefined): boolean {
  if (!header) return false;
  try {
    const hostname = new URL(`http://${header}`).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

function isAuthorized(request: IncomingMessage, token: Buffer): boolean {
  const value = request.headers.authorization;
  if (!value?.startsWith('Bearer ')) return false;
  const candidate = Buffer.from(value.slice(7), 'utf8');
  return candidate.length === token.length && timingSafeEqual(candidate, token);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const part of request) {
    const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part);
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw fault(413, 'BODY_TOO_LARGE', 'Request body exceeds 64 KiB.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw fault(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}

function requireJsonContent(request: IncomingMessage): void {
  const contentType = request.headers['content-type'];
  if (!contentType || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw fault(415, 'UNSUPPORTED_MEDIA_TYPE', 'Preview requests must use application/json.');
  }
  const contentEncoding = request.headers['content-encoding'];
  if (contentEncoding && contentEncoding.toLowerCase() !== 'identity') {
    throw fault(415, 'UNSUPPORTED_CONTENT_ENCODING', 'Encoded request bodies are not supported.');
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw fault(400, 'INVALID_REQUEST', 'Request body must be an object.');
  return value as Record<string, unknown>;
}

function takeRateLimit(key: string, buckets: Map<string, RateBucket>, now: number, limit: number, windowMs: number): number | null {
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    bucket = { startedAt: now, requests: 0 };
    buckets.set(key, bucket);
  }
  bucket.requests += 1;
  if (bucket.requests <= limit) return null;
  return Math.max(1, Math.ceil((bucket.startedAt + windowMs - now) / 1000));
}

function route(request: IncomingMessage, response: ServerResponse, token: Buffer, buckets: Map<string, RateBucket>, limit: number, windowMs: number): void {
  void (async () => {
    try {
      if (!isLoopbackHost(request.headers.host)) throw fault(421, 'LOOPBACK_HOST_REQUIRED', 'The local simulator gateway accepts loopback Host values only.');
      const authorized = isAuthorized(request, token);
      const peer = request.socket.remoteAddress ?? 'unknown';
      const retryAfter = takeRateLimit(`${peer}:${authorized ? 'authorized' : 'unauthorized'}`, buckets, Date.now(), limit, windowMs);
      if (retryAfter !== null) {
        response.setHeader('retry-after', String(retryAfter));
        send(response, 429, { apiVersion: API_VERSION, error: { code: 'RATE_LIMITED', message: 'Local simulator gateway request limit exceeded.' } });
        return;
      }
      if (!authorized) {
        response.setHeader('www-authenticate', 'Bearer');
        throw fault(401, 'UNAUTHORIZED', 'A valid local gateway token is required.');
      }
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (request.method === 'GET' && url.pathname === '/v1/health') {
        send(response, 200, { apiVersion: API_VERSION, status: 'ready', mode: 'SIMULATION', source: 'simulator', hardwareConnected: false, physicalOutputEnabled: false });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/v1/capabilities') {
        send(response, 200, { apiVersion: API_VERSION, adapter: 'simulator', mode: 'SIMULATION', zones: 11, channels: ['R', 'G', 'B', 'W'], scenePreview: true, physicalOutput: false, telemetry: [] });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/v1/preview') {
        requireJsonContent(request);
        const body = asRecord(await readJson(request));
        let scene: SceneFile;
        try { scene = validateSceneFile(body.scene); }
        catch (error) { throw fault(422, 'SCENE_INVALID', error instanceof Error ? error.message : 'Scene validation failed.'); }
        const timeSeconds = body.timeSeconds;
        if (typeof timeSeconds !== 'number' || !Number.isFinite(timeSeconds) || timeSeconds < 0 || timeSeconds > scene.durationSeconds) {
          throw fault(422, 'TIME_OUT_OF_RANGE', `Preview time must be between 0 and ${scene.durationSeconds} seconds.`);
        }
        send(response, 200, { apiVersion: API_VERSION, mode: 'SIMULATION', source: 'simulator', physicalOutputEnabled: false, sceneId: scene.id, timeSeconds, targets: interpolateScene(scene, timeSeconds) });
        return;
      }
      if (!['GET', 'POST'].includes(request.method ?? '')) {
        response.setHeader('allow', 'GET, POST');
        throw fault(405, 'METHOD_NOT_ALLOWED', 'This gateway route does not accept that method.');
      }
      throw fault(404, 'NOT_FOUND', 'Gateway route not found.');
    } catch (error) {
      const issue = error as Partial<GatewayFault>;
      send(response, issue.statusCode ?? 500, { apiVersion: API_VERSION, error: { code: issue.code ?? 'INTERNAL_ERROR', message: issue.message ?? 'Gateway request failed.' } });
    }
  })();
}

export function createGatewayServer(tokenValue: string, options: { rateLimit?: number; rateWindowMs?: number } = {}): Server {
  if (Buffer.byteLength(tokenValue, 'utf8') < 32) throw new Error('ADIGUN_GATEWAY_TOKEN must contain at least 32 UTF-8 bytes.');
  const rateLimit = options.rateLimit ?? DEFAULT_RATE_LIMIT;
  const rateWindowMs = options.rateWindowMs ?? DEFAULT_RATE_WINDOW_MS;
  if (!Number.isInteger(rateLimit) || rateLimit < 1) throw new Error('Gateway rate limit must be a positive integer.');
  if (!Number.isInteger(rateWindowMs) || rateWindowMs < 1) throw new Error('Gateway rate window must be a positive integer in milliseconds.');
  const token = Buffer.from(tokenValue, 'utf8');
  const buckets = new Map<string, RateBucket>();
  const server = createServer((request, response) => route(request, response, token, buckets, rateLimit, rateWindowMs));
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 64;
  server.maxConnections = 64;
  return server;
}

export async function startGateway(token: string, port = 4510): Promise<Server> {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Gateway port must be an integer from 0 to 65535.');
  const server = createGatewayServer(token);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
  return server;
}

