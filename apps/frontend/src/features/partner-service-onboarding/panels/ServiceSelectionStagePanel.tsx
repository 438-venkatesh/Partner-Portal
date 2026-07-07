import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { partnerDashboardApi } from '@/lib/api/partnerDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Layers, Link2 } from 'lucide-react';

interface Props {
  editable: boolean;
  submitted: boolean;
  onSubmit: () => void;
  submitting: boolean;
}

export function ServiceSelectionStagePanel({
  editable,
  submitted,
  onSubmit,
  submitting,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['partner-dashboard-relationships'],
    queryFn: () => partnerDashboardApi.getRelationships(),
  });

  const rows = data?.relationships ?? [];
  const active = rows.filter((r) => r.status === 'active');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Tenant service relationships
          </CardTitle>
          <CardDescription>
            Service selection is based on active tenant–service links assigned by Operations. Review what
            you will deliver, then submit for platform approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading relationships…</p>}
          {!isLoading && active.length === 0 && (
            <Alert>
              <AlertDescription>
                No active service relationships yet. Operations must create an active link before you can
                submit. Review links on the{' '}
                <Link to="/partner/services" className="text-primary underline">
                  Services
                </Link>{' '}
                page.
              </AlertDescription>
            </Alert>
          )}
          {active.length > 0 && (
            <ul className="space-y-3">
              {active.map((row) => (
                <li key={row.relationshipId} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{row.tenantName ?? row.tenantCode}</p>
                    <p className="text-sm text-muted-foreground">{row.serviceName ?? row.serviceCode}</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </li>
              ))}
            </ul>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/partner/services">
              <Link2 className="h-4 w-4 mr-1 inline" />
              View all relationships
            </Link>
          </Button>
        </CardContent>
      </Card>

      {editable && !submitted && (
        <Button
          className="w-full sm:w-auto"
          disabled={active.length === 0 || submitting}
          onClick={() => onSubmit()}
        >
          {submitting ? 'Submitting…' : 'Submit service selection for review'}
        </Button>
      )}
      {submitted && (
        <Alert>
          <AlertDescription>
            Submitted for platform review. Operations will approve this stage before initial review begins.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
