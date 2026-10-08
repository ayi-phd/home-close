import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    restoreMocks: true,
    // One in-memory MongoDB for the run (the first run downloads the binary, so allow time).
    globalSetup: ['./src/test/globalSetup.ts'],
    hookTimeout: 300_000,
  },
});
