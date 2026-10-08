import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Load @home-close/shared from its TypeScript source instead of its build output.
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source'], externalConditions: ['source'] } },
  test: {
    environment: 'node',
    restoreMocks: true,
    // One in-memory MongoDB for the run (the first run downloads the binary, so allow time).
    globalSetup: ['./src/test/globalSetup.ts'],
    hookTimeout: 300_000,
  },
});
