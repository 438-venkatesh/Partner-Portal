import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from '@tanstack/react-router';
import { partnerApi } from '@/lib/api/partners';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Globe, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentList } from '../components/DocumentList';
import { PerformanceCharts } from '../components/PerformanceCharts';
import { OnboardingWorkflow } from '../components/OnboardingWorkflow';
import { PartnerActions } from '../components/PartnerActions';
import { ServiceRelationships } from '../components/ServiceRelationships';
import { SupplierOnboardingWorkflow } from '@/features/suppliers/components/SupplierOnboardingWorkflow';
import { LogisticsOnboardingWorkflow } from '@/features/logistics/components/LogisticsOnboardingWorkflow';
import { supplierApi } from '@/lib/api/suppliers';
import { logisticsApi } from '@/lib/api/logistics';
import { useNavigate } from '@tanstack/react-router';
import { PartnerActivityPanel } from '../components/PartnerActivityPanel';
import { PartnerAgreementsPanel } from '../components/PartnerAgreementsPanel';

export function PartnerDetailPage() {
  const { partnerId } = useParams({ from: '/partners/$partnerId/' });
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['partners', partnerId],
    queryFn: () => partnerApi.getById(partnerId),
  });

  const { data: activationReadiness } = useQuery({
    queryKey: ['partners', partnerId, 'activation-readiness'],
    queryFn: () => partnerApi.getActivationReadiness(partnerId),
    enabled: !!data && data.status === 'pending',
  });

  // Get supplier/logistics info if partner is supplier/logistics type
  const isSupplierType = data?.partnerType === 'supplier' || data?.partnerType === 'supplier_logistics';
  const isLogisticsType = data?.partnerType === 'logistics_partner' || data?.partnerType === 'supplier_logistics';

  const { data: supplierData } = useQuery({
    queryKey: ['supplier-by-partner', partnerId],
    queryFn: () => supplierApi.getByPartnerId(partnerId),
    enabled: !!data && isSupplierType,
  });

  const { data: logisticsData } = useQuery({
    queryKey: ['logistics-by-partner', partnerId],
    queryFn: () => logisticsApi.getByPartnerId(partnerId),
    enabled: !!data && isLogisticsType,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 rounded bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-6 w-full bg-muted animate-pulse rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-destructive">
        Failed to load partner details.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/partners" params={{} as any}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{data.partnerName}</h1>
            <p className="text-muted-foreground">{data.partnerCode}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <PartnerActions
            partnerId={partnerId}
            currentStatus={data.status}
            canApprove={true}
            canSuspend={true}
            activationBlockers={activationReadiness?.blockers ?? []}
          />
          <Button
            onClick={() => navigate({ to: '/partners/$partnerId/edit', params: { partnerId } })}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Partner
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Display Name</p>
              <p className="font-medium">{data.displayName || data.partnerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Partner Type</p>
              <Badge variant="secondary" className="mt-1">
                {data.partnerType.replace('_', ' ')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={data.status as any} />
              </div>
            </div>
            {data.tier && (
              <div>
                <p className="text-sm text-muted-foreground">Tier</p>
                <Badge variant="outline" className="mt-1 capitalize">{data.tier}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.website && (
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {data.website}
                </a>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Registered: {new Date(data.registrationDate).toLocaleDateString()}
              </span>
            </div>
            {data.approvalDate && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Approved: {new Date(data.approvalDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {data.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="services">
          <ServiceRelationships partnerId={partnerId} canCreate canApprove />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentList partnerId={partnerId} canUpload canVerify />
        </TabsContent>
        <TabsContent value="agreements">
          <PartnerAgreementsPanel partnerId={partnerId} />
        </TabsContent>
        <TabsContent value="activity">
          <PartnerActivityPanel partnerId={partnerId} />
        </TabsContent>
        <TabsContent value="onboarding">
          {isSupplierType && supplierData && (
            <SupplierOnboardingWorkflow supplierId={supplierData.supplierId} partnerId={partnerId} canEdit={true} />
          )}
          {isLogisticsType && logisticsData && (
            <LogisticsOnboardingWorkflow logisticsId={logisticsData.logisticsId} partnerId={partnerId} canEdit={true} />
          )}
          {!isSupplierType && !isLogisticsType && (
            <OnboardingWorkflow
              partnerId={partnerId}
              partnerType={data.partnerType}
              canEdit={true}
            />
          )}
        </TabsContent>
        <TabsContent value="performance">
          <PerformanceCharts partnerId={partnerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

