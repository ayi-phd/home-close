import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { resetMockApi } from '../api';

beforeEach(() => resetMockApi());
afterEach(() => cleanup());
