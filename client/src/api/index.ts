/**
 * The app's API client. v0 has no backend, so this is the in-memory mock; swap in an HTTP
 * implementation of `HomeCloseApi` (fetching `import.meta.env.VITE_API_BASE_URL`) when the
 * Express API exists. Routes import `api` from here and nothing else.
 */
import type { HomeCloseApi } from './types';
import { createMockApi } from './mock/mockApi';

const mock = createMockApi();

export const api: HomeCloseApi = mock.api;

/** Restores the fixture data. Tests only. */
export const resetMockApi = mock.reset;

export * from './types';
