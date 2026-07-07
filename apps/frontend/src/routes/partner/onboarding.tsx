import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { partnerDashboardApi } from '@/lib/api/partnerDashboard';
import { usePartnerAuthStore } from '@/lib/stores/partnerAuthStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PartnerOnboardingTrackCard } from '@/components/partner/PartnerOnboardingTrackCard';
import { partnerTypeLabel } from '@/lib/partnerOnboardingStages';
import { resolveOnboardingTracks } from '@/lib/normalizePartnerOnboarding';
import { AlertTriangle, Building2 } from 'lucide-react';

export const Route = createFileRoute('/partner/onboarding')({
  component: PartnerOnboardingLayout,
});

/** Child routes (supplier stages, catalog) render via Outlet; hub stays on /partner/onboarding only. */
function PartnerOnboardingLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isSupplierStageRoute = pathname.startsWith('/partner/onboarding/supplier/');
  const isServiceStageRoute = pathname.startsWith('/partner/onboarding/service/');

  if (isSupplierStageRoute || isServiceStageRoute) {
    return <Outlet />;
  }

  return <PartnerOnboardingHub />;
}

function PartnerOnboardingHub() {
  const { user } = usePartnerAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-onboarding', user?.partnerId],
    queryFn: () => partnerDashboardApi.getOnboarding(),
    enabled: !!user?.partnerId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const tracks = data ? resolveOnboardingTracks(data) : [];

  const hasBlockedWorkflow =
    data?.service?.overallStatus === 'blocked' ||
    data?.supplier?.overallStatus === 'blocked' ||
    data?.logistics?.overallStatus === 'blocked';

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Onboarding</h1>
        <p className="text-muted-foreground mt-1">
          Track your onboarding progress. Stages match what the operations team sees for your partner type (
          {data ? partnerTypeLabel(data.partnerType) : '…'}). Use the links on each stage to complete tasks in
          this portal.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="h-10 bg-muted animate-pulse rounded-md" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not load onboarding</AlertTitle>
          <AlertDescription>Try again in a moment or contact support if this persists.</AlertDescription>
        </Alert>
      )}

      {data && (
        <>
          {hasBlockedWorkflow && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Onboarding paused</AlertTitle>
              <AlertDescription>
                A stage requires attention from you or from the platform team. Review the current stages below.
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Quick links</CardTitle>
              <CardDescription>Common tasks while onboarding is in progress.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/partner/dashboard">Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/partner/documents">Documents</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/partner/agreements">Agreements</Link>
              </Button>
              {tracks.includes('service') && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/partner/tenants">
                      <Building2 className="h-4 w-4 mr-1 inline" />
                      Tenants
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/partner/timelines">Timelines</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {tracks.includes('service') && data.service && (
            <div className="space-y-3">
              {data.service.currentStage && (
                <Button asChild>
                  <Link
                    to="/partner/onboarding/service/$stage"
                    params={{ stage: data.service.currentStage }}
                  >
                    Continue current stage
                  </Link>
                </Button>
              )}
              <PartnerOnboardingTrackCard
                track="service"
                workflow={data.service ?? null}
                partnerType={data.partnerType}
              />
            </div>
          )}
          {tracks.includes('service') && !data.service && (
            <PartnerOnboardingTrackCard
              track="service"
              workflow={null}
              partnerType={data.partnerType}
            />
          )}

          {tracks.includes('supplier') && data.supplier && (
            <div className="space-y-3">
              <Button asChild>
                <Link
                  to="/partner/onboarding/supplier/$stage"
                  params={{ stage: data.supplier.currentStage }}
                >
                  Continue current supplier stage
                </Link>
              </Button>
              <PartnerOnboardingTrackCard
                track="supplier"
                workflow={data.supplier ?? null}
                missingMessage="Supplier onboarding has not been initialized yet. Contact your platform administrator."
              />
            </div>
          )}
          {tracks.includes('supplier') && !data.supplier && (
            <PartnerOnboardingTrackCard
              track="supplier"
              workflow={null}
              missingMessage="Supplier onboarding has not been initialized yet. Contact your platform administrator."
            />
          )}

          {tracks.includes('logistics') && (
            <PartnerOnboardingTrackCard
              track="logistics"
              workflow={data.logistics ?? null}
              missingMessage="Logistics onboarding has not been initialized yet. Contact your platform administrator."
            />
          )}

          {tracks.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No onboarding workflow found</AlertTitle>
              <AlertDescription>
                We could not determine your onboarding steps. Ask your platform administrator to initialize onboarding
                for your partner account, then refresh this page.
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-dashed border-gray-300 bg-gray-50/80">
            <CardHeader>
              <CardTitle className="text-base">Need help?</CardTitle>
              <CardDescription>
                For supplier partners, complete each stage from the links below; platform review is required after
                catalog, documents, and training submissions. This page reflects the latest workflow for{' '}
                <span className="font-medium">{user?.partnerName}</span>.
              </CardDescription>
            </CardHeader>
          </Card>
        </>
      )}
    </div>
  );
}
