import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { partnerDashboardApi } from '@/lib/api/partnerDashboard';
import { partnerAuthApi } from '@/lib/api/partnerAuth';
import { hasServicePartnerClientPortal } from '@/lib/partnerTypeFlags';
import { partnerTypeLabel } from '@/lib/partnerOnboardingStages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight, Layers, ListChecks } from 'lucide-react';

export const Route = createFileRoute('/partner/tenants/')({
  component: PartnerTenantsIndexPage,
});

function PartnerTenantsIndexPage() {
  const { data: orgData } = useQuery({
    queryKey: ['partner-organization'],
    queryFn: () => partnerAuthApi.getOrganization(),
  });

  const partnerType = orgData?.organization?.partnerType;
  const isServicePartner = hasServicePartnerClientPortal(partnerType);

  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-tenants'],
    queryFn: () => partnerDashboardApi.getTenants(),
    enabled: isServicePartner,
  });

  const tenants = data?.tenants ?? [];

  if (!isServicePartner) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tenants</h1>
          <p className="text-muted-foreground mt-1">
            Tenant management is for service partners (agency, reseller, integrator, consultant, affiliate).
          </p>
        </div>
        <Card className="border-dashed border-gray-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Not available for your partner type
            </CardTitle>
            <CardDescription className="text-pretty">
              You are signed in as a{' '}
              <strong>{partnerType ? partnerTypeLabel(partnerType) : 'supplier or logistics'}</strong> partner.
              Tenant organizations and service timelines apply to partners who deliver tenant services—not to
              supplier or logistics onboarding flows.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" asChild>
              <Link to="/partner/onboarding">
                <ListChecks className="h-4 w-4 mr-1" />
                View onboarding
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/partner/documents">Documents</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/partner/agreements">Agreements</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tenants</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Organizations you support through active service relationships. Open a tenant to see services and
          timelines in one place.
        </p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-gray-200">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-4 animate-pulse" />
                <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-10 text-center text-destructive">
            Could not load tenants. Refresh the page or try again later.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && tenants.length === 0 && (
        <Card className="border-dashed border-gray-300 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              No tenants linked yet
            </CardTitle>
            <CardDescription className="text-pretty">
              Tenants appear when Operations creates an <strong>active</strong> link in{' '}
              <span className="font-mono text-xs">partner_tenant_service_relationships</span> for your partner.
            </CardDescription>
            <CardDescription className="pt-2 text-pretty">
              Local dev: run{' '}
              <span className="font-mono text-xs">pnpm --filter @partner-portal/backend db:seed-tenants</span>,{' '}
              <span className="font-mono text-xs">db:seed-service-catalog</span>, then{' '}
              <span className="font-mono text-xs">db:seed-test-partner-links</span> (for{' '}
              <span className="font-mono text-xs">test.partner@example.com</span>) or re-run{' '}
              <span className="font-mono text-xs">db:seed-all-partner-types</span> for service-type onboard accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link to="/partner/services">
                <Layers className="h-4 w-4 mr-1" />
                View all relationships
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && tenants.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tenants.map((t) => (
            <Link key={t.tenantId} to="/partner/tenants/$tenantId" params={{ tenantId: t.tenantId }} className="group">
              <Card className="h-full border-gray-200 shadow-sm transition-shadow hover:shadow-md hover:border-blue-200">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight group-hover:text-blue-700 transition-colors">
                      {t.tenantName ?? 'Unnamed tenant'}
                    </CardTitle>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </div>
                  {t.tenantCode && (
                    <Badge variant="secondary" className="w-fit font-mono text-xs">
                      {t.tenantCode}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t.serviceCount} active service{t.serviceCount === 1 ? '' : 's'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
