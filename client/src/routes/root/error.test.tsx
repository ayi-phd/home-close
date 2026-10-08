import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api';
import { ErrorBoundary } from './route';

function renderError(error: unknown) {
  const router = createMemoryRouter([{ path: '/', ErrorBoundary, loader: () => Promise.reject(error), Component: () => null }]);
  render(<RouterProvider router={router} />);
}

describe('root error boundary', () => {
  it('explains an unreachable server', async () => {
    renderError(new ApiError(0, { code: 'network_error', message: "Can't reach the Home Close server. Check that it's running." }));
    expect(await screen.findByRole('heading', { name: 'Server unavailable' })).toBeInTheDocument();
    expect(screen.getByText(/Can't reach the Home Close server/)).toBeInTheDocument();
  });

  it('explains an empty database', async () => {
    renderError(new ApiError(401, { code: 'unauthenticated', message: 'Sign in to continue.' }));
    expect(await screen.findByRole('heading', { name: 'No household yet' })).toBeInTheDocument();
    expect(screen.getByText(/npm run seed/)).toBeInTheDocument();
  });

  it('treats an API 404 as page not found', async () => {
    renderError(new ApiError(404, { code: 'not_found', message: 'Bill not found.' }));
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
