import { describe, expect, it, vi } from 'vitest';
import productBot from './product-bot.mjs';

const endpoint = 'https://adiguncabinlighting.hephzibahbehulah.com/api/bot';
const makeRequest = (body, headers = {}) => new Request(endpoint, {
  method: 'POST',
  headers: { Origin: new URL(endpoint).origin, 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});
const envWith = (run = vi.fn(async () => ({ response: 'Use a gradual transition and review it in the simulator.' })), limited = true) => ({
  AI: { run },
  BOT_LIMITER: { limit: vi.fn(async () => ({ success: limited })) },
  run,
});

describe('AdigunCabinLighting product copilot', () => {
  it('returns a real model response only after explicit consent', async () => {
    const env = envWith();
    const response = await productBot.fetch(makeRequest({
      consent: true,
      language: 'de',
      messages: [{ role: 'user', content: 'How can I soften a sunrise transition?' }],
    }), env);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ answer: 'Use a gradual transition and review it in the simulator.' });
    expect(env.run).toHaveBeenCalledWith('@cf/zai-org/glm-4.7-flash', expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'system', content: expect.stringContaining('German') }),
        { role: 'user', content: 'How can I soften a sunrise transition?' },
      ]),
      max_tokens: 400,
    }));
  });

  it('rejects a cross-origin request before calling AI', async () => {
    const env = envWith();
    const response = await productBot.fetch(makeRequest({ consent: true, language: 'en', messages: [{ role: 'user', content: 'Help' }] }, { Origin: 'https://evil.example' }), env);
    expect(response.status).toBe(403);
    expect(env.run).not.toHaveBeenCalled();
  });

  it('requires consent and never sends a message to AI without it', async () => {
    const env = envWith();
    const response = await productBot.fetch(makeRequest({ consent: false, language: 'en', messages: [{ role: 'user', content: 'Help' }] }), env);
    expect(response.status).toBe(400);
    expect(env.run).not.toHaveBeenCalled();
  });

  it('fails closed when AI or rate limiting is not configured', async () => {
    const response = await productBot.fetch(makeRequest({ consent: true, language: 'en', messages: [{ role: 'user', content: 'Help' }] }), {});
    expect(response.status).toBe(503);
  });

  it('honors rate limits without calling the model', async () => {
    const env = envWith(undefined, false);
    const response = await productBot.fetch(makeRequest({ consent: true, language: 'en', messages: [{ role: 'user', content: 'Help' }] }), env);
    expect(response.status).toBe(429);
    expect(env.run).not.toHaveBeenCalled();
  });

  it('rejects messages outside the bounded product chat contract', async () => {
    const env = envWith();
    const response = await productBot.fetch(makeRequest({ consent: true, language: 'en', messages: [{ role: 'user', content: 'x'.repeat(1001) }] }), env);
    expect(response.status).toBe(400);
    expect(env.run).not.toHaveBeenCalled();
  });
});
