import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { partnerDashboardApi } from '@/lib/api/partnerDashboard';
import { ServiceTimelineEditForm } from '@/components/partner/ServiceTimelineEditForm';

export const Route = createFileRoute('/partner/timelines/$timelineId/edit')({
  component: EditServiceTimelinePage,
});

function EditServiceTimelinePage() {
  const { timelineId } = Route.useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['partner-timelines'],
    queryFn: () => partnerDashboardApi.getTimelines(),
  });

  const timeline = data?.timelines.find((t) => t.timelineId === timelineId);

  return (
    <div className="w-full min-w-0 space-y-8 pb-12">
      <div className="w-full space-y-1">
        <Button variant="ghost" size="sm" className="-ml-3 w-fit gap-2 text-muted-foreground" asChild>
          <Link to="/partner/timelines">
            <ArrowLeft className="h-4 w-4" />
            Back to timelines
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit service timeline</h1>
        <p className="text-muted-foreground max-w-4xl text-pretty">
          Update title, dates, status, and notes for this line item.
        </p>
      </div>

      {isLoading ? (
        <Card className="w-full">
          <CardContent className="space-y-4 py-10">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </CardContent>
        </Card>
      ) : isError || !timeline ? (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Timeline not found</CardTitle>
            <CardDescription>It may have been removed or the link is incorrect.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/partner/timelines">Return to list</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full border shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>{timeline.title}</CardTitle>
            <CardDescription>Changes apply immediately after you save.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ServiceTimelineEditForm
              key={timeline.timelineId}
              timeline={timeline}
              onSuccess={() => navigate({ to: '/partner/timelines' })}
              onCancel={() => navigate({ to: '/partner/timelines' })}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
