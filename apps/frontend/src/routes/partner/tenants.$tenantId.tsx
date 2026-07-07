import React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { partnerDashboardApi } from '@/lib/api/partnerDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ArrowLeft, Calendar, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';

export const Route = createFileRoute('/partner/tenants/$tenantId')({
  component: TenantDetailPage,
});

function TenantDetailPage() {
  const navigate = useNavigate();
  const { tenantId } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-tenant-detail', tenantId],
    queryFn: () => partnerDashboardApi.getTenantDetail(tenantId),
  });

  const getDueDateStatus = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return { status: 'overdue', label: 'Overdue', color: 'destructive' as const };
    }
    if (isToday(date)) {
      return { status: 'today', label: 'Due Today', color: 'destructive' as const };
    }
    if (isTomorrow(date)) {
      return { status: 'tomorrow', label: 'Due Tomorrow', color: 'warning' as const };
    }
    return { status: 'upcoming', label: 'Upcoming', color: 'default' as const };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: '/partner/tenants' })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to tenants
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive">Failed to load tenant details</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate({ to: '/partner/tenants' })}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {data.tenant?.tenantName ?? 'Tenant'}
            </h1>
            <p className="text-muted-foreground">
              {data.tenant?.tenantCode && (
                <span className="font-mono text-sm mr-2">{data.tenant.tenantCode}</span>
              )}
              <span className="text-xs font-mono text-muted-foreground/80">{tenantId}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Relationships</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.serviceCount}</div>
            <p className="text-xs text-muted-foreground">Active services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Timelines</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeTimelines}</div>
            <p className="text-xs text-muted-foreground">Pending tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Timelines</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.timelines.length}</div>
            <p className="text-xs text-muted-foreground">All timelines</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Relationships */}
        <Card>
          <CardHeader>
            <CardTitle>Service Relationships</CardTitle>
            <CardDescription>Active service relationships with this tenant</CardDescription>
          </CardHeader>
          <CardContent>
            {data.relationships.length > 0 ? (
              <div className="space-y-3">
                {data.relationships.map((relationship) => (
                  <div
                    key={relationship.relationshipId}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="default">Active</Badge>
                          <span className="text-sm text-muted-foreground">
                            Service ID: {relationship.serviceId.slice(0, 8)}...
                          </span>
                        </div>
                        {relationship.startDate && (
                          <p className="text-sm text-muted-foreground">
                            Started: {format(new Date(relationship.startDate), 'MMM dd, yyyy')}
                          </p>
                        )}
                        {relationship.approvedServices && relationship.approvedServices.length > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {relationship.approvedServices.length} approved service(s)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No service relationships</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Timelines */}
        <Card>
          <CardHeader>
            <CardTitle>Service Timelines</CardTitle>
            <CardDescription>Upcoming and past service due dates</CardDescription>
          </CardHeader>
          <CardContent>
            {data.timelines.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {data.timelines.map((timeline) => {
                  const dueDateStatus = getDueDateStatus(timeline.dueDate);
                  return (
                    <div
                      key={timeline.timelineId}
                      className="p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{timeline.title}</h4>
                          {timeline.description && (
                            <p className="text-sm text-muted-foreground mt-1">{timeline.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(timeline.status)}
                          <Badge variant={getPriorityColor(timeline.priority)}>
                            {timeline.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(timeline.dueDate), 'MMM dd, yyyy')}</span>
                          </div>
                          <Badge variant={dueDateStatus.color}>{dueDateStatus.label}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {timeline.status.replace('_', ' ')}
                        </span>
                      </div>
                      {timeline.completedDate && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Completed: {format(new Date(timeline.completedDate), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No service timelines</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
