/**
 * The app's API client, chosen at build time from VITE_API_MODE:
 * - `http` (default): the Express API at VITE_API_BASE_URL (the Vite dev server proxies /api).
 * - `mock`: the in-memory sample household; used by tests and for working without a server.
 * Routes import `api` from here and nothing else.
 */
import { createHttpApi } from './http';
import { createMockApi } from './mock/mockApi';
import type { HomeCloseApi } from './types';

const MODES = ['http', 'mock'] as const;
type Mode = (typeof MODES)[number];

function readMode(value: string | undefined): Mode {
  const mode = value || 'http';
  if (!(MODES as readonly string[]).includes(mode)) throw new Error(`VITE_API_MODE must be "http" or "mock", got "${mode}".`);
  return mode as Mode;
}

const mode = readMode(import.meta.env.VITE_API_MODE);
const mock = createMockApi();

export const apiMode: Mode = mode;
export const api: HomeCloseApi = mode === 'mock' ? mock.api : createHttpApi(import.meta.env.VITE_API_BASE_URL || '/api/v1');

/** Restores the mock's sample data. Tests only. */
export const resetMockApi = mock.reset;

export * from './types';
