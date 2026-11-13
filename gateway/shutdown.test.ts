import type { Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installGracefulShutdown } from './shutdown.js';

const handlers = new Map<string, () => void>();

function setup(close: (callback?: (error?: Error) => void) => void, graceMs = 20_000) {
  handlers.clear();
  const processControl = {
    once: vi.fn((signal: string, handler: () => void) => { handlers.set(signal, handler); }),
    exit: vi.fn(),
  } as unknown as NodeJS.Process;
  const server = {
    close: vi.fn(close),
    closeAllConnections: vi.fn(),
  } as unknown as Server;
  installGracefulShutdown(server, processControl, graceMs);
  return { server, processControl };
}

afterEach(() => vi.useRealTimers());

describe('gateway process shutdown', () => {
  it('closes once on the first signal and exits cleanly after active work drains', () => {
    const close = vi.fn((callback?: (error?: Error) => void) => callback?.());
    const { server, processControl } = setup(close);
    handlers.get('SIGINT')?.();
    handlers.get('SIGTERM')?.();
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(server.closeAllConnections).not.toHaveBeenCalled();
    expect(processControl.exit).toHaveBeenCalledWith(0);
  });

  it('force-closes remaining connections after the grace period', () => {
    vi.useFakeTimers();
    const close = vi.fn(() => undefined);
    const { server, processControl } = setup(close, 1000);
    handlers.get('SIGTERM')?.();
    vi.advanceTimersByTime(1000);
    expect(server.closeAllConnections).toHaveBeenCalledOnce();
    expect(processControl.exit).toHaveBeenCalledWith(1);
  });

  it('rejects an invalid grace period', () => {
    const processControl = { once: vi.fn(), exit: vi.fn() } as unknown as NodeJS.Process;
    const server = { close: vi.fn(), closeAllConnections: vi.fn() } as unknown as Server;
    expect(() => installGracefulShutdown(server, processControl, 0)).toThrow(/positive integer/);
  });
});

