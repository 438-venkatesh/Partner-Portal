import { useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerOnboardingApi } from '@/lib/api/partnerOnboarding';
import { partnerAuthApi } from '@/lib/api/partnerAuth';
import type { OnboardingStage } from '@/lib/api/onboarding';
import { useToast } from '@/lib/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ServiceOnboardingStageShell } from './ServiceOnboardingStageShell';
import { PartnerRegistrationStagePanel } from '@/components/partner/PartnerRegistrationStagePanel';
import { ServiceSelectionStagePanel } from './panels/ServiceSelectionStagePanel';
import { ServiceAgreementStagePanel } from './panels/ServiceAgreementStagePanel';
import { ServiceUserSetupStagePanel } from './panels/ServiceUserSetupStagePanel';
import { ServiceTrainingStagePanel } from './panels/ServiceTrainingStagePanel';
import { ServiceTestingStagePanel } from './panels/ServiceTestingStagePanel';
import { DocumentationStagePanel } from '@/features/partner-supplier-onboarding/panels/DocumentationStagePanel';
import {
  getServiceStageAccess,
  resolvePartnerAdminOnlyStages,
  resolveServiceStageOrder,
} from '@/lib/serviceOnboardingConstants';
import { usePartnerAuthStore } from '@/lib/stores/partnerAuthStore';
import { Navigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  stage: OnboardingStage;
}

export function ServiceOnboardingStagePage({ stage }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = usePartnerAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['partner-onboarding'],
    queryFn: () => partnerOnboardingApi.getWorkflow(),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const { data: orgData } = useQuery({
    queryKey: ['partner-organization'],
    queryFn: () => partnerAuthApi.getOrganization(),
    enabled: stage === 'registration',
  });

  const workflow = data?.workflow;
  const partnerType = workflow?.partnerType ?? user?.partnerType ?? 'agency';
  const stageOrder = workflow ? resolveServiceStageOrder(partnerType, workflow) : [];
  const adminOnly = resolvePartnerAdminOnlyStages(partnerType, workflow);

  const stageInfo = workflow?.stages?.[stage];
  const access = workflow ? getServiceStageAccess(stage, workflow, partnerType) : 'locked';
  const editable = access === 'editable';
  const completed =
    !!workflow &&
    (workflow.completedStages.includes(stage) || stageInfo?.status === 'completed');
  const submitted = !!stageInfo?.submittedForReview && !completed;

  const submitMutation = useMutation({
    mutationFn: (payload?: Record<string, unknown>) =>
      partnerOnboardingApi.submitStage(stage, payload),
    onSuccess: () => {
      toast({ title: 'Submitted for platform review' });
      queryClient.invalidateQueries({ queryKey: ['partner-onboarding'] });
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

  if (!stageOrder.includes(stage)) {
    return <Navigate to="/partner/onboarding" />;
  }

  const handleSubmit = (payload?: Record<string, unknown>) => {
    const isPlainPayload =
      payload &&
      typeof payload === 'object' &&
      !('nativeEvent' in payload) &&
      !(payload instanceof Event);
    submitMutation.mutate(isPlainPayload ? payload : undefined);
  };

  return (
    <ServiceOnboardingStageShell stage={stage} workflow={workflow} partnerType={partnerType}>
      {stage === 'registration' && (
        <PartnerRegistrationStagePanel
          track="service"
          org={orgData?.organization}
          editable={editable}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['partner-onboarding'] });
            navigate({ to: '/partner/onboarding' });
          }}
          submitting={submitMutation.isPending}
        />
      )}

      {stage === 'service_selection' && (
        <ServiceSelectionStagePanel
          editable={editable}
          submitted={submitted}
          onSubmit={handleSubmit}
          submitting={submitMutation.isPending}
        />
      )}

      {stage === 'documentation' && (
        <DocumentationStagePanel
          editable={editable}
          submitted={submitted}
          completed={completed}
          adminMessage={String(stageInfo?.notes ?? '').trim() || undefined}
          onSubmit={handleSubmit}
          submitting={submitMutation.isPending}
        />
      )}

      {stage === 'agreement' && (
        <ServiceAgreementStagePanel
          editable={editable}
          submitted={submitted}
          onSubmit={handleSubmit}
          submitting={submitMutation.isPending}
        />
      )}

      {stage === 'user_setup' && (
        <ServiceUserSetupStagePanel
          editable={editable}
          submitted={submitted}
          onSubmit={() => handleSubmit()}
          submitting={submitMutation.isPending}
        />
      )}

      {stage === 'training' && (
        <ServiceTrainingStagePanel
          initial={(stageInfo?.stageData ?? stageInfo) as Record<string, unknown> | undefined}
          editable={editable}
          submitted={submitted}
          onSubmit={() => handleSubmit()}
          submitting={submitMutation.isPending}
        />
      )}

      {stage === 'testing' && (
        <ServiceTestingStagePanel
          initial={(stageInfo?.stageData ?? stageInfo) as Record<string, unknown> | undefined}
          editable={editable}
          submitted={submitted}
          onSubmit={() => handleSubmit()}
          submitting={submitMutation.isPending}
        />
      )}

      {adminOnly.includes(stage) && (
        <Card>
          <CardHeader>
            <CardTitle>Platform review</CardTitle>
            <CardDescription>
              This stage is completed by the operations team after reviewing your submission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription>
                No action is required from you right now. Check back on the onboarding hub for status
                updates.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

    </ServiceOnboardingStageShell>
  );
}
