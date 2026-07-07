import { createFileRoute, Outlet, redirect, useLocation } from '@tanstack/react-router';
import { PartnerLayout } from '@/components/layout/PartnerLayout';
import { ErrorBoundary } from '@/components/error-boundary';

/** Must not treat `/partners` (Operations) as partner self-service. */
function isPartnerSelfServicePath(pathname: string): boolean {
  return pathname === '/partner' || pathname.startsWith('/partner/');
}

export const Route = createFileRoute('/partner/__root')({
  component: PartnerRootLayout,
  // Note: Authentication is also handled at root level to ensure it works
  // even if routes are not properly nested
  beforeLoad: ({ location }) => {
    if (!isPartnerSelfServicePath(location.pathname)) {
      return;
    }
    // Define public routes that don't require authentication
    const publicRoutes = [
      '/partner/register',
      '/partner/login',
      '/partner/verify-email',
      '/partner/resend-verification',
      '/partner/forgot-password',
    ];
    
    // Check if current route is a public route or starts with reset-password
    const isPublicRoute = publicRoutes.some(route => location.pathname === route) ||
      location.pathname.startsWith('/partner/reset-password/');
    
    if (isPublicRoute) {
      return;
    }
    
    // Check for partner authentication (redundant check - also in root route)
    // This ensures protection even if route nesting is incorrect
    const token = localStorage.getItem('partner_auth_token');
    if (!token) {
      throw redirect({
        to: '/partner/login',
        search: {
          redirect: location.href,
        },
      });
    }
  },
});

function PartnerRootLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  
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
    return <Outlet />;
  }
  
  return (
    <ErrorBoundary>
      <PartnerLayout>
        <Outlet />
      </PartnerLayout>
    </ErrorBoundary>
  );
}
