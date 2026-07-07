import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceTimelineCreateForm } from '@/components/partner/ServiceTimelineCreateForm';

export const Route = createFileRoute('/partner/timelines/new')({
  validateSearch: (raw: Record<string, unknown>) => ({
    tenantId: typeof raw.tenantId === 'string' ? raw.tenantId : undefined,
    relationshipId: typeof raw.relationshipId === 'string' ? raw.relationshipId : undefined,
  }),
  component: NewServiceTimelinePage,
});

function NewServiceTimelinePage() {
  const navigate = useNavigate();
  const { tenantId, relationshipId } = Route.useSearch();

  return (
    <div className="w-full min-w-0 space-y-8 pb-12">
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <Button variant="ghost" size="sm" className="-ml-3 w-fit gap-2 text-muted-foreground" asChild>
            <Link to="/partner/timelines">
              <ArrowLeft className="h-4 w-4" />
              Back to timelines
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Create service timeline</h1>
          <p className="text-muted-foreground max-w-4xl text-pretty">
            Define a due date, recurrence, and ownership for work tied to a tenant relationship. Everything saves when
            you submit—no popup required.
          </p>
        </div>
      </div>

      <Card className="w-full border shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Timeline details</CardTitle>
          <CardDescription>Choose the tenant and service, then set schedule and notes.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ServiceTimelineCreateForm
            initialTenantId={tenantId}
            initialRelationshipId={relationshipId}
            onSuccess={() => navigate({ to: '/partner/timelines' })}
            onCancel={() => navigate({ to: '/partner/timelines' })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
