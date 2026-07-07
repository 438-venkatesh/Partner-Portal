import { useQuery } from '@tanstack/react-query';
import { onboardingApi, SupplierOnboardingStage, OnboardingStatus } from '@/lib/api/onboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { useState } from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, SkipForward } from 'lucide-react';
import { format } from 'date-fns';
import { SupplierOnboardingStageReview } from './SupplierOnboardingStageReview';

interface SupplierOnboardingWorkflowProps {
  supplierId: string;
  partnerId?: string;
  canEdit?: boolean;
}

const STAGE_LABELS: Record<SupplierOnboardingStage, string> = {
  supplier_registration: 'Supplier Registration',
  catalog_setup: 'Catalog Setup',
  supplier_documentation: 'Document Upload',
  supplier_verification: 'Verification & Review',
  supplier_agreement: 'Supplier Agreement',
  payment_setup: 'Payment & Terms Setup',
  supplier_portal_access: 'Portal Access & Training',
  supplier_activation: 'Supplier Activation',
};

const STAGE_DESCRIPTIONS: Record<SupplierOnboardingStage, string> = {
  supplier_registration: 'Supplier registration and basic information',
  catalog_setup: 'Create and setup product catalog',
  supplier_documentation: 'Upload required documents',
  supplier_verification: 'Document verification and review',
  supplier_agreement: 'Sign supplier agreement',
  payment_setup: 'Configure payment terms and methods',
  supplier_portal_access: 'Complete portal training and testing',
  supplier_activation: 'Final activation and go live',
};

const STAGE_ORDER: SupplierOnboardingStage[] = [
  'supplier_registration',
  'catalog_setup',
  'supplier_documentation',
  'supplier_verification',
  'supplier_agreement',
  'payment_setup',
  'supplier_portal_access',
  'supplier_activation',
];

export function SupplierOnboardingWorkflow({ supplierId, partnerId, canEdit = false }: SupplierOnboardingWorkflowProps) {
  const [reviewStage, setReviewStage] = useState<SupplierOnboardingStage | null>(null);

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['supplier-onboarding', supplierId],
    queryFn: () => onboardingApi.getSupplierWorkflow(supplierId),
  });

  const getStageIcon = (status: OnboardingStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'blocked':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'skipped':
        return <SkipForward className="h-5 w-5 text-gray-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStageStatus = (stage: SupplierOnboardingStage): OnboardingStatus => {
    if (!workflow) return 'pending';
    const stageData = workflow.stages[stage];
    return stageData?.status || 'pending';
  };

  const getCurrentStageIndex = () => {
    if (!workflow) return 0;
    return STAGE_ORDER.indexOf(workflow.currentStage);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supplier Onboarding Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!workflow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supplier Onboarding Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No onboarding workflow found.</p>
        </CardContent>
      </Card>
    );
  }

  const currentStageIndex = getCurrentStageIndex();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Supplier Onboarding Workflow</CardTitle>
              <CardDescription>Supplier onboarding progress</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <StatusBadge
                status={
                  workflow.overallStatus === 'completed'
                    ? 'active'
                    : workflow.overallStatus === 'blocked'
                    ? 'suspended'
                    : 'pending'
                }
              />
              <Badge variant="outline">
                Stage {currentStageIndex + 1} of {STAGE_ORDER.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Current Stage</p>
                <p className="text-lg font-bold">{STAGE_LABELS[workflow.currentStage]}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-lg font-bold">
                  {workflow.completedStages.length} / {STAGE_ORDER.length} stages
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {STAGE_ORDER.map((stage, index) => {
                const status = getStageStatus(stage);
                const isCurrent = workflow.currentStage === stage;
                const isPast = index < currentStageIndex;
                const stageData = workflow.stages[stage];
                const submitted = (stageData as { submittedForReview?: boolean })?.submittedForReview;

                return (
                  <div
                    key={stage}
                    className={`flex items-start space-x-4 p-4 rounded-lg border-2 ${
                      isCurrent
                        ? 'border-primary bg-primary/5'
                        : isPast
                        ? 'border-green-200 bg-green-50'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">{getStageIcon(status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{STAGE_LABELS[stage]}</h4>
                          <p className="text-sm text-muted-foreground">{STAGE_DESCRIPTIONS[stage]}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusBadge
                            status={
                              status === 'completed'
                                ? 'active'
                                : status === 'blocked'
                                ? 'suspended'
                                : 'pending'
                            }
                          />
                          {submitted && <Badge variant="secondary">Submitted</Badge>}
                          {canEdit && (submitted || isCurrent || status === 'in_progress' || status === 'blocked') && (
                            <Button
                              variant={isCurrent && status !== 'completed' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setReviewStage(stage)}
                            >
                              {isCurrent && !submitted && ['supplier_verification', 'payment_setup', 'supplier_activation'].includes(stage)
                                ? 'Approve step'
                                : 'Review'}
                            </Button>
                          )}
                        </div>
                      </div>
                      {stageData?.stageData?.completedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed:{' '}
                          {format(new Date(String(stageData.stageData.completedAt)), 'MMM dd, yyyy')}
                        </p>
                      )}
                      {stageData?.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{stageData.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {workflow.notes && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Workflow Notes</p>
                <p className="text-sm text-muted-foreground">{workflow.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {reviewStage && (
        <SupplierOnboardingStageReview
          supplierId={supplierId}
          partnerId={partnerId}
          stage={reviewStage}
          open={!!reviewStage}
          onOpenChange={(open) => !open && setReviewStage(null)}
          stageData={
            (workflow.stages[reviewStage] as { stageData?: Record<string, unknown> })?.stageData
          }
          submittedForReview={
            (workflow.stages[reviewStage] as { submittedForReview?: boolean })?.submittedForReview ??
            (
              (workflow.stages[reviewStage] as { stageData?: { submittedForReview?: boolean } })
                ?.stageData?.submittedForReview
            )
          }
        />
      )}
    </>
  );
}
