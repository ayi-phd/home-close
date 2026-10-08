import { isRouteErrorResponse, Link, Outlet, useRouteError } from 'react-router';
import { ApiError } from '../../api';
import { Toaster } from '../../components/toast';

export default function Root() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

/** Shown while the first route's data loads from the API. */
export function HydrateFallback() {
  return (
    <main className="content" aria-busy="true">
      <p className="empty">Loading…</p>
    </main>
  );
}

function describe(error: unknown): { title: string; detail: string } {
  if ((isRouteErrorResponse(error) && error.status === 404) || (error instanceof ApiError && error.status === 404)) {
    return { title: 'Page not found', detail: "That page doesn't exist." };
  }
  if (error instanceof ApiError && error.code === 'network_error') return { title: 'Server unavailable', detail: error.message };
  if (error instanceof ApiError && error.status === 401) {
    return { title: 'No household yet', detail: 'The server has no household to sign in to. For local development, run npm run seed.' };
  }
  if (error instanceof ApiError) return { title: 'Something went wrong', detail: error.message };
  return { title: 'Something went wrong', detail: 'Try again, or go back to the overview.' };
}

export function ErrorBoundary() {
  const { title, detail } = describe(useRouteError());
  return (
    <main className="content">
      <section className="card empty" role="alert">
        <h1>{title}</h1>
        <p className="muted">{detail}</p>
        <p>
          <Link to="/">Back to overview</Link>
        </p>
      </section>
    </main>
  );
}
