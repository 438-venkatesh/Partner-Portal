import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { tenantsApi } from '@/lib/api/tenants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const Route = createFileRoute('/tenants/')({
  component: TenantsPage,
});

function TenantsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantsApi.list(),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <p className="text-muted-foreground text-sm">Manage tenant organizations (Operations).</p>
        </div>
        <Link to="/tenants/new">
          <Button type="button">
            <Plus className="h-4 w-4 mr-2" />
            New tenant
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && (
            <p className="text-sm text-destructive">{(error as Error).message || 'Failed to load'}</p>
          )}
          {!isLoading && !error && (
            <ul className="divide-y rounded-md border">
              {data?.tenants?.length ? (
                data.tenants.map((t) => (
                  <li key={t.tenantId}>
                    <Link
                      to="/tenants/$tenantId"
                      params={{ tenantId: t.tenantId }}
                      className="px-4 py-3 text-sm flex justify-between gap-4 hover:bg-muted/50"
                    >
                      <span className="font-medium">{t.tenantName}</span>
                      <span className="text-muted-foreground">{t.tenantCode}</span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-4 py-6 text-center text-muted-foreground text-sm">
                  No tenants yet — create one or run seed data.
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
