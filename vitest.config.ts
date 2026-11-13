import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts', 'gateway/**/*.test.ts', 'packages/**/*.test.ts', 'operator/**/*.test.ts'] },
});
