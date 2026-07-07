import { createFileRoute, Outlet } from '@tanstack/react-router';

/**
 * Layout for `/partners/:partnerId/*` so child routes (e.g. `/edit`, `/relationships/new`) render via `<Outlet />`.
 */
export const Route = createFileRoute('/partners/$partnerId')({
  component: () => <Outlet />,
});
