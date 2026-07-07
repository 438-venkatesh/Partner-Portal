import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import { onboardingApi, OnboardingStage, SupplierOnboardingStage } from '@/lib/api/onboarding';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AdminPartnerReviewQueue,
  type AdminReviewQueueTarget,
} from '../components/AdminPartnerReviewQueue';
import { AdminSupplierCatalogPanel } from '@/features/suppliers/components/AdminSupplierCatalogPanel';
import { SupplierOnboardingStageReview } from '@/features/suppliers/components/SupplierOnboardingStageReview';
import { PartnerOnboardingStageReview } from '@/features/partners/components/PartnerOnboardingStageReview';
import { RefreshCw } from 'lucide-react';

type SupplierReviewTarget = {
  track: 'supplier';
  supplierId: string;
  partnerId: string;
  stage: SupplierOnboardingStage;
};

type ServiceReviewTarget = {
  track: 'service';
  partnerId: string;
  stage: OnboardingStage;
};

type ReviewTarget = SupplierReviewTarget | ServiceReviewTarget;

export function AdminPartnerOperationsPage() {
  const queryClient = useQueryClient();
  const search = useSearch({ strict: false }) as { tab?: string };
  const [tab, setTab] = useState<'queue' | 'catalog'>(() =>
    search.tab === 'catalog' ? 'catalog' : 'queue',
  );
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);

  useEffect(() => {
    if (search.tab === 'catalog') setTab('catalog');
    if (search.tab === 'queue') setTab('queue');
  }, [search.tab]);

  const { data: queueItems } = useQuery({
    queryKey: ['admin-onboarding-review-queue'],
    queryFn: async () => {
      const [supplier, service] = await Promise.all([
        onboardingApi.getSupplierReviewQueue(),
        onboardingApi.getPartnerReviewQueue(),
      ]);
      return supplier.queue.length + service.queue.length;
    },
  });

  const queueCount = queueItems ?? 0;

  const { data: reviewWorkflow } = useQuery({
    queryKey: [
      'supplier-onboarding',
      reviewTarget?.track === 'supplier' ? reviewTarget.supplierId : null,
    ],
    queryFn: () => {
      if (reviewTarget?.track !== 'supplier') throw new Error('Not a supplier review');
      return onboardingApi.getSupplierWorkflow(reviewTarget.supplierId);
    },
    enabled: reviewTarget?.track === 'supplier',
  });

  const handleReviewFromQueue = (target: AdminReviewQueueTarget) => {
    if (target.track === 'supplier') {
      setReviewTarget({
        track: 'supplier',
        supplierId: target.supplierId,
        partnerId: target.partnerId,
        stage: target.stage,
      });
      if (target.stage === 'catalog_setup') {
        setTab('catalog');
      }
      return;
    }

    setReviewTarget({
      track: 'service',
      partnerId: target.partnerId,
      stage: target.stage,
    });
  };

  const handleCatalogReview = (target: {
    supplierId: string;
    partnerId: string;
    stage: SupplierOnboardingStage;
  }) => {
    setReviewTarget({ track: 'supplier', ...target });
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-onboarding-review-queue'] });
    queryClient.invalidateQueries({ queryKey: ['supplier-review-queue'] });
    queryClient.invalidateQueries({ queryKey: ['admin-supplier-partners'] });
    queryClient.invalidateQueries({ queryKey: ['admin-supplier-products'] });
  };

  const closeReview = () => {
    setReviewTarget(null);
    queryClient.invalidateQueries({ queryKey: ['admin-onboarding-review-queue'] });
  };

  return (
    <div className="space-y-6 max-w-6xl pb-8">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Partner operations</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Review onboarding submissions from all partner types — agencies, resellers, suppliers,
            and more — and manage supplier product catalogs.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} className="shrink-0">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'queue' | 'catalog')}>
        <TabsList className="h-10">
          <TabsTrigger value="queue" className="gap-2">
            Onboarding review
            {queueCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
                {queueCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="catalog">Supplier product catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-5 focus-visible:outline-none">
          <AdminPartnerReviewQueue onReview={handleReviewFromQueue} />
        </TabsContent>

        <TabsContent value="catalog" className="mt-5 focus-visible:outline-none">
          <AdminSupplierCatalogPanel onCompleteStageReview={handleCatalogReview} />
        </TabsContent>
      </Tabs>

      {reviewTarget?.track === 'supplier' && (
        <SupplierOnboardingStageReview
          supplierId={reviewTarget.supplierId}
          partnerId={reviewTarget.partnerId}
          stage={reviewTarget.stage}
          open
          onOpenChange={(open) => !open && closeReview()}
          stageData={reviewWorkflow?.stages?.[reviewTarget.stage]?.stageData}
          submittedForReview={
            (reviewWorkflow?.stages?.[reviewTarget.stage] as { submittedForReview?: boolean })
              ?.submittedForReview ??
            ['supplier_verification', 'payment_setup', 'supplier_activation'].includes(reviewTarget.stage)
          }
        />
      )}

      {reviewTarget?.track === 'service' && (
        <PartnerOnboardingStageReview
          partnerId={reviewTarget.partnerId}
          stage={reviewTarget.stage}
          open
          onOpenChange={(open) => !open && closeReview()}
          submittedForReview
        />
      )}
    </div>
  );
}
