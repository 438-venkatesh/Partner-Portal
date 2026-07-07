import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { partnerDashboardApi } from '@/lib/api/partnerDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Layers, Link2, Activity } from 'lucide-react';

export const Route = createFileRoute('/partner/services')({
  component: PartnerServicesPage,
});

function PartnerServicesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-dashboard-relationships'],
    queryFn: () => partnerDashboardApi.getRelationships(),
  });

  const rows = data?.relationships ?? [];
  const active = rows.filter((r) => r.status === 'active').length;
  const pending = rows.filter((r) => r.status === 'pending' || r.status === 'pending_approval').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Services</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Every row is a tenant service relationship. Use it to see which clients consume which catalog services, then
          open the tenant for timelines and delivery detail.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total relationships</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{isLoading ? '—' : rows.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <Link2 className="h-3.5 w-3.5" /> All statuses
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-green-700">{isLoading ? '—' : active}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" /> In production or live
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Pending / review</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-amber-700">{isLoading ? '—' : pending}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" /> Awaiting approval or setup
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Service relationships</CardTitle>
          <CardDescription>Includes pending and active links across all tenants.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">Could not load relationships.</p>}
          {!isLoading && !error && rows.length === 0 && (
            <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              <Layers className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium text-gray-800">No service relationships yet</p>
              <p className="text-sm mt-1">Relationships appear when the platform connects you to tenant services.</p>
            </div>
          )}
          {!isLoading && !error && rows.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.relationshipId}>
                      <TableCell>
                        <Link
                          to="/partner/tenants/$tenantId"
                          params={{ tenantId: r.tenantId }}
                          className="font-medium text-primary hover:underline"
                        >
                          {r.tenantName ?? r.tenantId.slice(0, 8)}
                        </Link>
                        {r.tenantCode && (
                          <span className="text-muted-foreground text-xs block">{r.tenantCode}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{r.serviceName}</span>
                        <span className="text-muted-foreground text-xs block font-mono">{r.serviceCode}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {String(r.status).replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.startDate
                          ? new Date(r.startDate as unknown as string).toLocaleDateString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
