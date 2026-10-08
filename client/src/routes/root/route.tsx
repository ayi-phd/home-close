import { isRouteErrorResponse, Link, Outlet, useRouteError } from 'react-router';
import { Toaster } from '../../components/toast';

export default function Root() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="content">
      <section className="card empty" role="alert">
        <h1>{notFound ? 'Page not found' : 'Something went wrong'}</h1>
        <p className="muted">{notFound ? "That page doesn't exist." : 'Try again, or go back to the overview.'}</p>
        <p>
          <Link to="/">Back to overview</Link>
        </p>
      </section>
    </main>
  );
}
