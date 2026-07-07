import { useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerSupplierOnboardingApi } from '@/lib/api/partnerSupplierOnboarding';
import { partnerAuthApi } from '@/lib/api/partnerAuth';
import type { SupplierOnboardingStage } from '@/lib/api/onboarding';
import { useToast } from '@/lib/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { SupplierOnboardingStageShell } from './SupplierOnboardingStageShell';
import { getSupplierStageAccess } from './supplierOnboardingConstants';
import { PartnerRegistrationStagePanel } from '@/components/partner/PartnerRegistrationStagePanel';
import { CatalogSetupStagePanel } from './panels/CatalogSetupStagePanel';
import { DocumentationStagePanel } from './panels/DocumentationStagePanel';
import { VerificationStagePanel } from './panels/VerificationStagePanel';
import { AgreementStagePanel } from './panels/AgreementStagePanel';
import { PaymentSetupStagePanel } from './panels/PaymentSetupStagePanel';
import { PortalAccessStagePanel } from './panels/PortalAccessStagePanel';
import { ActivationStagePanel } from './panels/ActivationStagePanel';

interface Props {
  stage: SupplierOnboardingStage;
}

export function SupplierOnboardingStagePage({ stage }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['partner-supplier-onboarding'],
    queryFn: () => partnerSupplierOnboardingApi.getWorkflow(),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const { data: orgData } = useQuery({
    queryKey: ['partner-organization'],
    queryFn: () => partnerAuthApi.getOrganization(),
    enabled: stage === 'supplier_registration',
  });

  const workflow = data?.workflow;
  const stageInfo = workflow?.stages?.[stage];
  const access = workflow ? getSupplierStageAccess(stage, workflow) : 'locked';
  const editable = access === 'editable';
  const completed =
    !!workflow &&
    (workflow.completedStages.includes(stage) || stageInfo?.status === 'completed');
  const submitted = !!stageInfo?.submittedForReview && !completed;
  const adminMessage = String(
    stageInfo?.stageData?.notes ?? stageInfo?.notes ?? ''
  ).trim();

  const submitMutation = useMutation({
    mutationFn: () => partnerSupplierOnboardingApi.submitStage(stage),
    onSuccess: () => {
      toast({ title: 'Submitted successfully' });
      queryClient.invalidateQueries({ queryKey: ['partner-supplier-onboarding'] });
      navigate({ to: '/partner/onboarding' });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string; details?: string[] } } };
      const details = err?.response?.data?.details;
      toast({
        title: 'Submit failed',
        description: Array.isArray(details) ? details.join('. ') : err?.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading || !workflow) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSubmit = () => submitMutation.mutate();

  return (
    <SupplierOnboardingStageShell stage={stage} workflow={workflow}>
      {stage === 'supplier_registration' && (
        <PartnerRegistrationStagePanel
          track="supplier"
          org={orgData?.organization}
          editable={editable}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['partner-supplier-onboarding'] });
            navigate({ to: '/partner/onboarding' });
          }}
          submitting={submitMutation.isPending}
        />
      )}

      {stage === 'catalog_setup' && (
        <CatalogSetupStagePanel
          editable={editable}
          submitted={submitted}
          onSubmitted={() => navigate({ to: '/partner/onboarding' })}
        />
      )}

      {stage === 'supplier_documentation' && (
        <DocumentationStagePanel
          editable={editable}
          submitted={submitted}
          completed={completed}
          adminMessage={adminMessage || undefined}
          onSubmit={handleSubmit}
          submitting={submitMutation.isPending}
        />
      )}

      {stage === 'supplier_verification' && (
        <VerificationStagePanel
          workflow={workflow}
          stageData={stageInfo?.stageData as Record<string, unknown> | undefined}
          notes={stageInfo?.notes}
          completed={completed}
          access={access}
        />
      )}

      {stage === 'supplier_agreement' && (
        <AgreementStagePanel
          editable={editable}
          submitted={submitted}
          completed={completed}
          adminMessage={adminMessage || undefined}
          onSubmit={handleSubmit}
          submitting={submitMutation.isPending}
        />
      )}

      {stage === 'payment_setup' && (
        <PaymentSetupStagePanel
          supplier={data?.supplier as Record<string, unknown> | undefined}
          stageData={stageInfo?.stageData as Record<string, unknown> | undefined}
          completed={completed}
          notes={stageInfo?.notes}
        />
      )}

      {stage === 'supplier_portal_access' && (
        <PortalAccessStagePanel
          initial={stageInfo?.stageData as Record<string, unknown> | undefined}
          editable={editable}
          submitted={submitted}
          onSubmit={handleSubmit}
          submitting={submitMutation.isPending}
        />
      )}

      {stage === 'supplier_activation' && (
        <ActivationStagePanel
          workflow={{
            completedStages: workflow.completedStages,
            overallStatus: workflow.overallStatus,
          }}
          notes={stageInfo?.notes}
        />
      )}
    </SupplierOnboardingStageShell>
  );
}
