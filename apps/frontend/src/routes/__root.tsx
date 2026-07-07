import { createRootRoute, Outlet, useLocation, redirect } from '@tanstack/react-router';
import { Layout } from '@/components/layout/Layout';
import { PartnerLayout } from '@/components/layout/PartnerLayout';
import { ErrorBoundary } from '@/components/error-boundary';

/**
 * Partner self-service app only: `/partner` and `/partner/...`.
 * `/partners` (Operations Portal list) must NOT match — `startsWith('/partner')` is true for `/partners`.
 */
function isPartnerSelfServicePath(pathname: string): boolean {
  return pathname === '/partner' || pathname.startsWith('/partner/');
}

/** Public partner directory — anyone can browse it, no login of any kind required. */
function isPublicDirectoryPath(pathname: string): boolean {
  return pathname === '/directory' || pathname.startsWith('/directory/');
}

export const Route = createRootRoute({
  component: RootComponent,
  beforeLoad: ({ location }) => {
    const pathname = location.pathname;

    // Operations Portal: require platform JWT (auth_token), except /login and the public directory
    if (
      !isPartnerSelfServicePath(pathname) &&
      !isPublicDirectoryPath(pathname) &&
      pathname !== '/login'
    ) {
      const platformToken = localStorage.getItem('auth_token');
      if (!platformToken) {
        throw redirect({
          to: '/login',
          search: {
            redirect: location.href,
          },
        });
      }
    }

    // Partner self-service routes: partner JWT (not Operations `/partners`)
    if (isPartnerSelfServicePath(pathname)) {
      // Define public routes that don't require authentication
      const publicRoutes = [
        '/partner/register',
        '/partner/login',
        '/partner/verify-email',
        '/partner/resend-verification',
        '/partner/forgot-password',
      ];
      
      // Check if current route is a public route or starts with reset-password
      const isPublicRoute = publicRoutes.some(route => pathname === route) ||
        pathname.startsWith('/partner/reset-password/');
      
      if (isPublicRoute) {
        return;
      }
      
      // Check for partner authentication
      const token = localStorage.getItem('partner_auth_token');
      if (!token) {
        throw redirect({
          to: '/partner/login',
          search: {
            redirect: location.href,
          },
        });
      }
    }
  },
});

function RootComponent() {
  const location = useLocation();
  const pathname = location.pathname;
  
  // Partner self-service routes — apply PartnerLayout (not `/partners` Operations)
  if (isPartnerSelfServicePath(pathname)) {
    // Define auth pages that shouldn't show the PartnerLayout
    const authPages = [
      '/partner/register',
      '/partner/login',
      '/partner/verify-email',
      '/partner/resend-verification',
      '/partner/forgot-password',
    ];
    
    const isAuthPage = authPages.some(page => pathname === page) ||
      pathname.startsWith('/partner/reset-password/');
    
    // Don't show layout for auth pages
    if (isAuthPage) {
      return (
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      );
    }
    
    // For protected partner routes, apply PartnerLayout
    // This ensures layout works even if /partner/__root is not in the route tree
    return (
      <ErrorBoundary>
        <PartnerLayout>
          <Outlet />
        </PartnerLayout>
      </ErrorBoundary>
    );
  }
  
  // Operations Portal login / public directory — full-screen only (no admin chrome)
  if (pathname === '/login' || isPublicDirectoryPath(pathname)) {
    return (
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    );
  }

  // Admin/platform routes use the admin Layout
  return (
    <ErrorBoundary>
      <Layout>
        <Outlet />
      </Layout>
    </ErrorBoundary>
  );
}

