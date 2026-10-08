/// <reference types="vitest/config" />
import { defaultClientConditions, defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // API_PROXY_TARGET is dev-server config only; it is not exposed to the browser bundle.
  const env = loadEnv(mode, '..', '');
  return {
    envDir: '..',
    plugins: [react()],
    // Load @home-close/shared from its TypeScript source instead of its build output.
    resolve: { conditions: ['source', ...defaultClientConditions] },
    server: {
      proxy: { '/api': { target: env.API_PROXY_TARGET || 'http://localhost:3000', changeOrigin: false } },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
      env: { VITE_API_MODE: 'mock' },
    },
  };
});
