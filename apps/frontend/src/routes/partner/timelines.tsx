import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerDashboardApi } from '@/lib/api/partnerDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Clock, AlertTriangle, Plus, Pencil } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { useToast } from '@/lib/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const Route = createFileRoute('/partner/timelines')({
  component: ServiceTimelinesPage,
});

function ServiceTimelinesPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== '/partner/timelines') {
    return <Outlet />;
  }
  return <ServiceTimelinesList />;
}

function ServiceTimelinesList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: timelinesData, isLoading } = useQuery({
    queryKey: ['partner-timelines'],
    queryFn: () => partnerDashboardApi.getTimelines(),
  });

  const statusUpdateMutation = useMutation({
    mutationFn: ({
      timelineId,
      status,
      completedDate,
    }: {
      timelineId: string;
      status: string;
      completedDate?: string;
    }) => partnerDashboardApi.updateTimelineStatus(timelineId, status as any, completedDate),
    onSuccess: () => {
      toast({
        title: 'Status updated',
        description: 'The timeline status was saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['partner-timelines'] });
      queryClient.invalidateQueries({ queryKey: ['partner-dashboard-stats'] });
    },
    onError: (error: { message?: string }) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Could not update status.',
        variant: 'destructive',
      });
    },
  });

  const getDueDateStatus = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return { status: 'overdue', label: 'Overdue', color: 'destructive' as const };
    }
    if (isToday(date)) {
      return { status: 'today', label: 'Due today', color: 'destructive' as const };
    }
    if (isTomorrow(date)) {
      return { status: 'tomorrow', label: 'Due tomorrow', color: 'warning' as const };
    }
    return { status: 'upcoming', label: 'Upcoming', color: 'default' as const };
  };

  const handleStatusUpdate = (timelineId: string, status: string) => {
    const completedDate = status === 'completed' ? new Date().toISOString() : undefined;
    statusUpdateMutation.mutate({ timelineId, status, completedDate });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Service timelines</h1>
          <p className="text-muted-foreground max-w-2xl">
            Track due dates and recurring work across tenants. Create and edit timelines on dedicated pages—no modals.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link
            to="/partner/timelines/new"
            search={{ tenantId: undefined, relationshipId: undefined }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New timeline
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse rounded-md bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : timelinesData?.timelines && timelinesData.timelines.length > 0 ? (
        <div className="space-y-4">
          {timelinesData.timelines.map((timeline) => {
            const dueDateStatus = getDueDateStatus(timeline.dueDate);
            return (
              <Card key={timeline.timelineId} className="overflow-hidden border shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{timeline.title}</h2>
                        <Badge variant={dueDateStatus.color}>{dueDateStatus.label}</Badge>
                        <Badge variant="outline" className="capitalize">
                          {timeline.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {timeline.description || 'No description'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-4 w-4 shrink-0" />
                          Due {format(new Date(timeline.dueDate), 'MMM d, yyyy')}
                        </span>
                        <span className="hidden sm:inline">·</span>
                        <span>{timeline.serviceType}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="font-mono text-xs">Tenant {timeline.tenantId.slice(0, 8)}…</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                      <div className="flex items-center gap-2">
                        {timeline.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                        ) : timeline.status === 'in_progress' ? (
                          <Clock className="h-5 w-5 shrink-0 text-blue-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                        )}
                        <span className="text-sm capitalize text-muted-foreground">
                          {timeline.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={timeline.status}
                          onValueChange={(value) => handleStatusUpdate(timeline.timelineId, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            to="/partner/timelines/$timelineId/edit"
                            params={{ timelineId: timeline.timelineId }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-7 w-7 text-muted-foreground" />
            </div>
            <CardTitle>No service timelines yet</CardTitle>
            <CardDescription>
              When you add timelines, they show up here with due dates and status.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-10">
            <Button asChild size="lg">
              <Link
            to="/partner/timelines/new"
            search={{ tenantId: undefined, relationshipId: undefined }}
          >
                <Plus className="mr-2 h-4 w-4" />
                Create your first timeline
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
