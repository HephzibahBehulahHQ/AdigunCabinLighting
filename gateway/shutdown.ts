import type { Server } from 'node:http';

export const DEFAULT_SHUTDOWN_GRACE_MS = 20_000;

type ShutdownProcess = Pick<NodeJS.Process, 'once' | 'exit'>;

export function installGracefulShutdown(
  server: Pick<Server, 'close' | 'closeAllConnections'>,
  processControl: ShutdownProcess = process,
  graceMs = DEFAULT_SHUTDOWN_GRACE_MS,
): void {
  if (!Number.isInteger(graceMs) || graceMs < 1) throw new Error('Gateway shutdown grace must be a positive integer in milliseconds.');
  let stopping = false;

  const stop = (signal: 'SIGINT' | 'SIGTERM') => {
    if (stopping) return;
    stopping = true;
    console.info(`Received ${signal}; stopping the local simulator gateway.`);
    const forceClose = setTimeout(() => {
      console.error('Gateway shutdown grace expired; closing remaining local connections.');
      server.closeAllConnections();
      processControl.exit(1);
    }, graceMs);
    forceClose.unref?.();

    server.close((error) => {
      clearTimeout(forceClose);
      if (error) {
        console.error('Gateway failed to close cleanly.');
        processControl.exit(1);
        return;
      }
      processControl.exit(0);
    });
  };

  processControl.once('SIGINT', () => stop('SIGINT'));
  processControl.once('SIGTERM', () => stop('SIGTERM'));
}

