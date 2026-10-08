import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../routes';

/** Renders the real route table at `path` against the in-memory API (reset before each test). */
export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  render(<RouterProvider router={router} />);
  return { router, user };
}

/** Waits for the page title (h1) to appear. */
export function findPage(title: string | RegExp) {
  return screen.findByRole('heading', { level: 1, name: title });
}
