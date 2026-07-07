import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { onboardingApi, SupplierOnboardingStage } from '@/lib/api/onboarding';
import { productApi, Product } from '@/lib/api/products';
import { documentApi } from '@/lib/api/documents';
import { ProductDetailDialog } from './ProductDetailDialog';
import { AdminSupplierDocumentsReviewPanel } from './AdminSupplierDocumentsReviewPanel';
import { AdminCatalogProductsReviewPanel } from '@/components/admin/AdminCatalogProductsReviewPanel';
import { AdminAgreementsReviewPanel } from '@/components/admin/AdminAgreementsReviewPanel';
import {
  countMissingApprovedRequiredDocTypes,
  hasCountersignedAgreement,
} from '@/lib/onboardingReviewRequirements';
import { partnerApi } from '@/lib/api/partners';
import { AdminSupplierVerificationReviewPanel } from './AdminSupplierVerificationReviewPanel';
import { SUPPLIER_REQUIRED_DOCUMENTS } from '@/features/partner-supplier-onboarding/supplierOnboardingConstants';
import { useToast } from '@/lib/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormTextarea, FormField, FormInput } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface Props {
  supplierId: string;
  partnerId?: string;
  stage: SupplierOnboardingStage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageData?: Record<string, unknown>;
  submittedForReview?: boolean;
}

const ADMIN_ONLY_STAGES: SupplierOnboardingStage[] = [
  'supplier_verification',
  'payment_setup',
  'supplier_activation',
];

export function SupplierOnboardingStageReview({
  supplierId,
  partnerId,
  stage,
  open,
  onOpenChange,
  stageData,
  submittedForReview,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('net_30');
  const [creditLimit, setCreditLimit] = useState('');
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const agreementName = 'Supplier Master Agreement';

  const { data: workflowData, isLoading: loadingWorkflow } = useQuery({
    queryKey: ['supplier-onboarding', supplierId],
    queryFn: () => onboardingApi.getSupplierWorkflow(supplierId),
    enabled: open,
  });

  const { data: allProductsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', supplierId, 'all-for-review'],
    queryFn: () => productApi.getSupplierProducts(supplierId, { limit: 200 }),
    enabled: open && stage === 'catalog_setup',
  });

  const stageEntry = workflowData?.stages?.[stage] as
    | {
        status?: string;
        submittedForReview?: boolean;
        stageData?: Record<string, unknown>;
      }
    | undefined;

  const resolvedStageData =
    stageData ??
    stageEntry?.stageData ??
    (stageEntry as { stageData?: Record<string, unknown> } | undefined)?.stageData;

  const resolvedSubmitted =
    submittedForReview === true ||
    stageEntry?.submittedForReview === true ||
    resolvedStageData?.submittedForReview === true;

  const stageStatus = stageEntry?.status ?? 'pending';
  const isCompleted = stageStatus === 'completed';

  const allProducts = allProductsData?.products ?? [];
  const pendingProducts = useMemo(
    () => allProducts.filter((p) => p.status === 'pending_approval'),
    [allProducts]
  );
  const activeProducts = useMemo(
    () => allProducts.filter((p) => p.status === 'active'),
    [allProducts]
  );

  const canReview = useMemo(() => {
    if (loadingWorkflow) return false;
    if (isCompleted) return false;
    if (ADMIN_ONLY_STAGES.includes(stage)) return true;
    if (resolvedSubmitted) return true;
    if (stageStatus === 'in_progress' || stageStatus === 'blocked') return true;
    if (stage === 'catalog_setup' && allProducts.length >= 5) return true;
    return false;
  }, [
    loadingWorkflow,
    isCompleted,
    stage,
    resolvedSubmitted,
    stageStatus,
    allProducts.length,
  ]);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const notes = approveNotes.trim() || undefined;
      if (stage === 'payment_setup') {
        return onboardingApi.approveSupplierStage(supplierId, stage, {
          notes,
          stageData: {
            paymentTerms,
            creditLimit: creditLimit || undefined,
            currency: 'USD',
          },
        });
      }
      return onboardingApi.approveSupplierStage(supplierId, stage, { notes });
    },
    onSuccess: () => {
      toast({ title: 'Stage approved' });
      queryClient.invalidateQueries({ queryKey: ['supplier-onboarding', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['products', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['admin-supplier-products'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-review-queue'] });
      if (partnerId) {
        queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'activation-readiness'] });
        queryClient.invalidateQueries({ queryKey: ['documents', partnerId] });
      }
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string; details?: string[] } } };
      const details = err?.response?.data?.details;
      toast({
        title: 'Approve failed',
        description: Array.isArray(details)
          ? details.join('. ')
          : err?.response?.data?.message ?? 'Could not approve this stage',
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => onboardingApi.rejectSupplierStage(supplierId, stage, rejectReason),
    onSuccess: () => {
      toast({ title: 'Stage rejected' });
      queryClient.invalidateQueries({ queryKey: ['supplier-onboarding', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-review-queue'] });
      onOpenChange(false);
      setRejectReason('');
    },
  });

  const createAgreementMutation = useMutation({
    mutationFn: () =>
      onboardingApi.createSupplierAgreement(supplierId, { agreementName }),
    onSuccess: () => {
      toast({ title: 'Agreement created for partner signature' });
    },
  });

  const { data: partnerDocuments, isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', partnerId],
    queryFn: () => documentApi.getPartnerDocuments(partnerId!),
    enabled: open && Boolean(partnerId) && stage === 'supplier_documentation',
  });

  const docsRequirementMet = useMemo(() => {
    if (!partnerDocuments) return false;
    return countMissingApprovedRequiredDocTypes(SUPPLIER_REQUIRED_DOCUMENTS, partnerDocuments) === 0;
  }, [partnerDocuments]);
  const documentationBlocksApprove =
    stage === 'supplier_documentation' && (!partnerId || !docsRequirementMet);

  const { data: agreementsData } = useQuery({
    queryKey: ['partners', partnerId, 'agreements'],
    queryFn: () => partnerApi.getAgreements(partnerId!),
    enabled: open && Boolean(partnerId) && stage === 'supplier_agreement',
  });

  const agreementRequirementMet = useMemo(
    () => hasCountersignedAgreement(agreementsData?.agreements ?? []),
    [agreementsData]
  );
  const agreementBlocksApprove =
    stage === 'supplier_agreement' && (!partnerId || !agreementRequirementMet);

  const approveHint = useMemo(() => {
    if (isCompleted) return 'This stage is already completed.';
    if (stage === 'catalog_setup') {
      if (allProducts.length < 5) {
        return 'Partner needs at least 5 products before catalog setup can be approved.';
      }
      if (pendingProducts.length > 0) {
        return `Approve or reject products above (${pendingProducts.length} still pending), then advance the stage.`;
      }
      return 'Approve the stage after you have reviewed each catalog product.';
    }
    if (stage === 'supplier_documentation') {
      if (!partnerId) return 'Partner ID is required to review documents.';
      if (!docsRequirementMet) {
        return 'Each required document type must have at least one approved file before stage approval.';
      }
      return 'Review each file (approve or reject), then approve the stage to advance.';
    }
    if (stage === 'supplier_verification') {
      return 'Confirm the onboarding package (registration, catalog, documents), then approve platform verification.';
    }
    if (stage === 'supplier_agreement') {
      if (!agreementRequirementMet) {
        return 'Accept (countersign) at least one signed agreement before approving this stage. Rejected agreements do not count.';
      }
      return 'At least one agreement is accepted. Approve the stage to let the partner continue.';
    }
    return 'Approve to mark this stage complete and advance onboarding.';
  }, [
    stage,
    pendingProducts.length,
    allProducts.length,
    activeProducts.length,
    isCompleted,
    partnerId,
    docsRequirementMet,
    agreementRequirementMet,
  ]);

  const catalogBlocksApprove = stage === 'catalog_setup' && allProducts.length < 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {stage === 'supplier_verification' ? 'Platform verification' : 'Review stage'}
          </DialogTitle>
          <DialogDescription>
            {stage === 'supplier_verification'
              ? 'Confirm prior onboarding steps, then approve or reject platform verification.'
              : stage === 'supplier_documentation'
                ? 'Review uploaded compliance documents.'
                : stage.replace(/_/g, ' ')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {stageStatus.replace(/_/g, ' ')}
            </Badge>
            {resolvedSubmitted && (
              <Badge variant="secondary">Partner submitted for review</Badge>
            )}
          </div>

          {resolvedStageData?.submittedAt ? (
            <p className="text-sm text-muted-foreground">
              Submitted: {new Date(String(resolvedStageData.submittedAt)).toLocaleString()}
            </p>
          ) : null}

          {stage === 'catalog_setup' && (
            <div className="space-y-3">
              {loadingProducts ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading products…
                </p>
              ) : allProducts.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No products in this catalog yet. Ask the partner to add products before approving.
                  </AlertDescription>
                </Alert>
              ) : (
                <AdminCatalogProductsReviewPanel
                  supplierId={supplierId}
                  products={allProducts}
                  onViewProduct={setViewProduct}
                />
              )}
              <p className="text-xs text-muted-foreground">{approveHint}</p>
            </div>
          )}

          {stage === 'supplier_documentation' && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploaded documents</p>
              {!partnerId ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    Partner ID is missing for this supplier — documents cannot be loaded. Open review from
                    the supplier operations page or ensure the review queue includes partnerId.
                  </AlertDescription>
                </Alert>
              ) : loadingDocs ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading documents…
                </p>
              ) : (
                <AdminSupplierDocumentsReviewPanel partnerId={partnerId} canVerify />
              )}
              <p className="text-xs text-muted-foreground">{approveHint}</p>
            </div>
          )}

          {stage === 'supplier_verification' && (
            <div className="space-y-2">
              {!partnerId || !workflowData ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {!partnerId
                      ? 'Partner ID is missing — cannot load verification summary.'
                      : 'Loading workflow…'}
                  </AlertDescription>
                </Alert>
              ) : (
                <AdminSupplierVerificationReviewPanel
                  supplierId={supplierId}
                  partnerId={partnerId}
                  workflow={{
                    currentStage: workflowData.currentStage,
                    completedStages: workflowData.completedStages,
                    stages: workflowData.stages,
                  }}
                />
              )}
              <p className="text-xs text-muted-foreground">{approveHint}</p>
            </div>
          )}

          {stage === 'payment_setup' && (
            <div className="space-y-3">
              <FormInput
                label="Payment terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
              <FormInput
                label="Credit limit"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="100000"
              />
            </div>
          )}

          {stage === 'supplier_agreement' && partnerId && (
            <div className="space-y-3">
              <AdminAgreementsReviewPanel partnerId={partnerId} supplierId={supplierId} />
              <Alert>
                <AlertDescription className="text-sm">
                  If no agreement exists yet, issue one for the partner to sign.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                size="sm"
                onClick={() => createAgreementMutation.mutate()}
                disabled={createAgreementMutation.isPending}
              >
                {createAgreementMutation.isPending ? 'Issuing…' : 'Issue supplier agreement'}
              </Button>
            </div>
          )}

          {stage === 'supplier_activation' && (
            <p className="text-sm text-muted-foreground">
              Approving will set the partner status to active and enable the supplier portal.
            </p>
          )}

          <FormField label="Message to partner (optional — shown on approve)">
            <FormTextarea
              label="Approval note"
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              placeholder="Optional note the partner will see after approval…"
              rows={2}
            />
          </FormField>

          <FormField label="Rejection reason (required if rejecting)">
            <FormTextarea
              label="Reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain what the partner must fix — they will see this message…"
              rows={3}
            />
          </FormField>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
          <Button
            variant="destructive"
            onClick={() => rejectMutation.mutate()}
            disabled={!rejectReason.trim() || rejectMutation.isPending || isCompleted}
          >
            Reject
          </Button>
          <Button
            onClick={() => approveMutation.mutate()}
            disabled={
              !canReview ||
              approveMutation.isPending ||
              catalogBlocksApprove ||
              documentationBlocksApprove ||
              agreementBlocksApprove ||
              isCompleted
            }
            title={
              catalogBlocksApprove
                ? 'Requires at least 5 products'
                : documentationBlocksApprove
                  ? 'Each required document type needs an approved file'
                  : agreementBlocksApprove
                    ? 'Requires at least one agreement accepted by operations'
                    : !canReview
                    ? 'Stage is not ready for approval'
                    : undefined
            }
          >
            {approveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Approving…
              </>
            ) : (
              'Approve & advance'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {viewProduct && (
        <ProductDetailDialog
          product={viewProduct}
          open={!!viewProduct}
          onOpenChange={(open) => !open && setViewProduct(null)}
        />
      )}
    </Dialog>
  );
}
