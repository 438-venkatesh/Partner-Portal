import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { partnerDashboardApi } from '@/lib/api/partnerDashboard';
import { partnerAuthApi } from '@/lib/api/partnerAuth';
import { partnerSupplierOnboardingApi } from '@/lib/api/partnerSupplierOnboarding';
import { partnerSupplierCatalogApi } from '@/lib/api/partnerSupplierCatalog';
import {
  hasServicePartnerClientPortal,
  hasSupplierPortalNav,
  hasLogisticsPortalNav,
} from '@/lib/partnerTypeFlags';
import { partnerTypeLabel, ONBOARDING_TRACK_CONFIG } from '@/lib/partnerOnboardingStages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  ArrowRight,
  Plus,
  UserPlus,
  FileText,
  Loader2,
  Package,
  ListChecks,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';

export const Route = createFileRoute('/partner/dashboard')({
  component: PartnerDashboardPage,
});

function PartnerDashboardPage() {
  const navigate = useNavigate();

  const { data: orgData } = useQuery({
    queryKey: ['partner-organization'],
    queryFn: () => partnerAuthApi.getOrganization(),
  });
  const partnerType = orgData?.organization?.partnerType;
  const showClientManagement = hasServicePartnerClientPortal(partnerType);
  const showSupplierNav = hasSupplierPortalNav(partnerType);
  const showLogisticsNav = hasLogisticsPortalNav(partnerType);

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['partner-dashboard-stats'],
    queryFn: () => partnerDashboardApi.getStats(),
    enabled: showClientManagement,
  });

  const { data: tenantsData, isLoading: isLoadingTenants, error: tenantsError } = useQuery({
    queryKey: ['partner-tenants'],
    queryFn: () => partnerDashboardApi.getTenants(),
    enabled: showClientManagement,
  });

  const { data: timelinesData, isLoading: isLoadingTimelines, error: timelinesError } = useQuery({
    queryKey: ['partner-timelines'],
    queryFn: () => partnerDashboardApi.getTimelines(),
    enabled: showClientManagement,
  });

  const { data: supplierOnboarding, isLoading: isLoadingSupplierWf } = useQuery({
    queryKey: ['partner-supplier-onboarding'],
    queryFn: () => partnerSupplierOnboardingApi.getWorkflow(),
    enabled: showSupplierNav,
  });

  const { data: productCount } = useQuery({
    queryKey: ['partner-supplier-product-count'],
    queryFn: () => partnerSupplierCatalogApi.getProductCount(),
    enabled: showSupplierNav,
  });

  const getDueDateStatus = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return { status: 'overdue', label: 'Overdue', color: 'destructive' as const, bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    }
    if (isToday(date)) {
      return { status: 'today', label: 'Due Today', color: 'destructive' as const, bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
    }
    if (isTomorrow(date)) {
      return { status: 'tomorrow', label: 'Due Tomorrow', color: 'warning' as const, bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
    }
    return { status: 'upcoming', label: 'Upcoming', color: 'default' as const, bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return { variant: 'destructive' as const, className: 'bg-red-100 text-red-800 border-red-300' };
      case 'high':
        return { variant: 'destructive' as const, className: 'bg-orange-100 text-orange-800 border-orange-300' };
      case 'medium':
        return { variant: 'default' as const, className: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'low':
        return { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800 border-gray-300' };
      default:
        return { variant: 'default' as const, className: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {partnerType
              ? `${partnerTypeLabel(partnerType)} portal — ${showSupplierNav ? 'complete onboarding and manage your catalog' : showLogisticsNav ? 'complete logistics onboarding' : 'overview of your operations'}.`
              : "Welcome back! Here's an overview of your partner operations."}
          </p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {showClientManagement && (
          <>
            <Button
              onClick={() => navigate({ to: '/partner/timelines' })}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" />
          <span>Create Timeline</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/partner/timelines' })}
          className="flex items-center space-x-2 border-gray-300 hover:bg-gray-50"
        >
          <FileText className="h-4 w-4" />
          <span>View All Timelines</span>
        </Button>
          </>
        )}
        {showSupplierNav && supplierOnboarding?.workflow && (
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
            <Link
              to="/partner/onboarding/supplier/$stage"
              params={{ stage: supplierOnboarding.workflow.currentStage }}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Continue onboarding
            </Link>
          </Button>
        )}
        {showSupplierNav && (
          <Button variant="outline" asChild className="border-gray-300">
            <Link to="/partner/onboarding/supplier/catalog">
              <Package className="h-4 w-4 mr-2" />
              Product catalog
            </Link>
          </Button>
        )}
        {(showSupplierNav || showLogisticsNav) && (
          <Button variant="outline" asChild className="border-gray-300">
            <Link to="/partner/onboarding">View all onboarding stages</Link>
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/partner/employees' })}
          className="flex items-center space-x-2 border-gray-300 hover:bg-gray-50"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite Employee</span>
        </Button>
      </div>

      {showSupplierNav && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Supplier onboarding</CardTitle>
              <CardDescription>8-stage workflow to go live as a supplier</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSupplierWf ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : supplierOnboarding?.workflow ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Current stage: </span>
                    <span className="font-medium">
                      {ONBOARDING_TRACK_CONFIG.supplier.stageCopy[supplierOnboarding.workflow.currentStage]
                        ?.title ?? supplierOnboarding.workflow.currentStage.replace(/_/g, ' ')}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {supplierOnboarding.workflow.completedStages.length} of{' '}
                    {ONBOARDING_TRACK_CONFIG.supplier.stageOrder.length} stages completed
                  </p>
                  <Badge variant="outline" className="capitalize">
                    {supplierOnboarding.workflow.overallStatus.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Onboarding will appear once your supplier profile is ready.</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Product catalog</CardTitle>
              <CardDescription>Products submitted for platform approval</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{productCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">products in your catalog</p>
              <Button variant="link" className="px-0 mt-2" asChild>
                <Link to="/partner/onboarding/supplier/catalog">Manage catalog</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {showClientManagement && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Clients Card */}
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Active Clients</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {isLoadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                stats?.activeClients || 0
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Tenant organizations</p>
          </CardContent>
        </Card>

        {/* Total Relationships Card */}
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Relationships</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {isLoadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                stats?.totalRelationships || 0
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Active service relationships</p>
          </CardContent>
        </Card>

        {/* Upcoming Due Dates Card */}
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Upcoming Due Dates</CardTitle>
            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {isLoadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                stats?.upcomingDueDates || 0
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Next 30 days</p>
          </CardContent>
        </Card>

        {/* Overdue Items Card */}
        <Card className={`bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow ${(stats?.overdueItems || 0) > 0 ? 'border-red-300 bg-red-50' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Overdue Items</CardTitle>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${(stats?.overdueItems || 0) > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertTriangle className={`h-4 w-4 ${(stats?.overdueItems || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(stats?.overdueItems || 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {isLoadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                stats?.overdueItems || 0
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>
      )}

      {showClientManagement && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Clients Section */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Your Clients</CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Tenant organizations you provide services to
                </CardDescription>
              </div>
              {tenantsData?.tenants && tenantsData.tenants.length > 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 hover:bg-gray-50"
                  onClick={() => {
                    navigate({ to: '/partner/tenants' });
                  }}
                >
                  View All ({tenantsData.tenants.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTenants ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : tenantsError ? (
              <div className="text-center py-8 text-red-600">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>Failed to load clients</p>
                <p className="text-sm text-gray-500 mt-1">Please try refreshing the page</p>
              </div>
            ) : tenantsData?.tenants && tenantsData.tenants.length > 0 ? (
              <div className="space-y-3">
                {tenantsData.tenants.slice(0, 5).map((tenant) => (
                  <div
                    key={tenant.tenantId}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 cursor-pointer transition-all"
                    onClick={() => {
                      navigate({ to: `/partner/tenants/${tenant.tenantId}` });
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Tenant {tenant.tenantId.slice(0, 8)}...</p>
                        <p className="text-sm text-gray-500">
                          {tenant.serviceCount} service{tenant.serviceCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="font-medium text-gray-700 mb-1">No active clients yet</p>
                <p className="text-sm text-gray-500">Start by creating service relationships</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Timelines Section */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Service Timelines</CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Upcoming service due dates and deadlines
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-gray-50"
                onClick={() => navigate({ to: '/partner/timelines' })}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTimelines ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : timelinesError ? (
              <div className="text-center py-8 text-red-600">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>Failed to load timelines</p>
                <p className="text-sm text-gray-500 mt-1">Please try refreshing the page</p>
              </div>
            ) : timelinesData?.timelines && timelinesData.timelines.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {timelinesData.timelines.slice(0, 10).map((timeline) => {
                  const dueDateStatus = getDueDateStatus(timeline.dueDate);
                  const priorityStyle = getPriorityColor(timeline.priority);
                  return (
                    <div
                      key={timeline.timelineId}
                      className={`p-4 border rounded-lg transition-all hover:shadow-md ${dueDateStatus.bgColor} ${dueDateStatus.borderColor}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{timeline.title}</h4>
                          {timeline.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{timeline.description}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {timeline.serviceType} • Tenant {timeline.tenantId.slice(0, 8)}...
                          </p>
                        </div>
                        <Badge className={`${priorityStyle.className} border`}>
                          {timeline.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">
                              {format(new Date(timeline.dueDate), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <Badge variant={dueDateStatus.color} className="text-xs">
                            {dueDateStatus.label}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(timeline.status)}
                          <span className="text-xs text-gray-600 capitalize">
                            {timeline.status?.replace('_', ' ') || 'pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="font-medium text-gray-700 mb-1">No service timelines</p>
                <p className="text-sm text-gray-500">Service due dates will appear here</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-gray-300 hover:bg-gray-50"
                  onClick={() => navigate({ to: '/partner/timelines' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Timeline
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {showClientManagement && stats && stats.overdueItems > 0 && stats.overdueTimelines && stats.overdueTimelines.length > 0 && (
        <Card className="border-red-300 bg-red-50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>Overdue Items Requiring Attention</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.overdueTimelines.slice(0, 5).map((timeline) => (
                <div
                  key={timeline.timelineId}
                  className="p-4 border border-red-200 rounded-lg bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{timeline.title}</h4>
                      <p className="text-sm text-gray-600">
                        {timeline.serviceType} • Due {formatDistanceToNow(new Date(timeline.dueDate), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => {
                        navigate({ to: '/partner/timelines' });
                      }}
                    >
                      View Timeline
                    </Button>
                  </div>
                </div>
              ))}
              {stats.overdueTimelines.length > 5 && (
                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => navigate({ to: '/partner/timelines' })}
                  >
                    View All {stats.overdueItems} Overdue Items
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
