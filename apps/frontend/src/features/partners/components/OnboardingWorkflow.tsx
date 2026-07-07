import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi, OnboardingStage, OnboardingStatus } from '@/lib/api/onboarding';
import { useToast } from '@/lib/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormTextarea, FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, PlayCircle, SkipForward } from 'lucide-react';
import { format } from 'date-fns';
import { PartnerOnboardingStageReview } from './PartnerOnboardingStageReview';
import {
  resolvePartnerAdminOnlyStages,
  resolveServiceStageOrder,
} from '@/lib/serviceOnboardingConstants';
import { getServicePartnerOnboardingFlow } from '@/lib/partnerOnboardingByType';

interface OnboardingWorkflowProps {
  partnerId: string;
  partnerType: string;
  canEdit?: boolean;
}

const STAGE_LABELS: Record<OnboardingStage, string> = {
  registration: 'Registration',
  service_selection: 'Service Selection',
  initial_review: 'Initial Review',
  documentation: 'Documentation',
  verification: 'Verification',
  agreement: 'Agreement',
  app_access: 'App Access',
  user_setup: 'User Setup',
  training: 'Training',
  testing: 'Testing',
  go_live: 'Go Live',
};

const STAGE_DESCRIPTIONS: Record<OnboardingStage, string> = {
  registration: 'Partner registration and basic information',
  service_selection: 'Select services to offer',
  initial_review: 'Initial review by platform admin',
  documentation: 'Upload required documents',
  verification: 'Document verification',
  agreement: 'Sign service agreements',
  app_access: 'Grant application access',
  user_setup: 'Setup partner users',
  training: 'Complete training modules',
  testing: 'Testing and validation',
  go_live: 'Go live and activation',
};

export function OnboardingWorkflow({ partnerId, partnerType, canEdit = false }: OnboardingWorkflowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [reviewStage, setReviewStage] = useState<OnboardingStage | null>(null);
  const [selectedStage, setSelectedStage] = useState<OnboardingStage | null>(null);
  const [updateStatus, setUpdateStatus] = useState<OnboardingStatus>('in_progress');
  const [updateNotes, setUpdateNotes] = useState('');

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['onboarding', partnerId],
    queryFn: () => onboardingApi.getWorkflow(partnerId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { stage: OnboardingStage; status: OnboardingStatus; notes?: string }) =>
      onboardingApi.updateStage(partnerId, data),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Onboarding stage updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['onboarding', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'activation-readiness'] });
      setUpdateDialogOpen(false);
      setSelectedStage(null);
      setUpdateNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update stage',
        variant: 'destructive',
      });
    },
  });

  const handleUpdateStage = (stage: OnboardingStage) => {
    setSelectedStage(stage);
    const currentStageData = workflow?.stages[stage];
    setUpdateStatus(currentStageData?.status || 'pending');
    setUpdateNotes(currentStageData?.notes || '');
    setUpdateDialogOpen(true);
  };

  const handleUpdateSubmit = () => {
    if (!selectedStage) return;
    updateMutation.mutate({
      stage: selectedStage,
      status: updateStatus,
      notes: updateNotes || undefined,
    });
  };

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

  const getStageStatus = (stage: OnboardingStage): OnboardingStatus => {
    if (!workflow) return 'pending';
    const stageData = workflow.stages[stage];
    return stageData?.status || 'pending';
  };

  const isStageCompleted = (stage: OnboardingStage) => {
    return getStageStatus(stage) === 'completed';
  };

  const isStageBlocked = (stage: OnboardingStage) => {
    return getStageStatus(stage) === 'blocked';
  };

  const stageOrder = workflow
    ? resolveServiceStageOrder(workflow.partnerType ?? partnerType, workflow)
    : resolveServiceStageOrder(partnerType);
  const adminOnlyStages = resolvePartnerAdminOnlyStages(workflow?.partnerType ?? partnerType, workflow);
  const flowMeta = getServicePartnerOnboardingFlow(workflow?.partnerType ?? partnerType);

  const getCurrentStageIndex = () => {
    if (!workflow) return 0;
    return stageOrder.indexOf(workflow.currentStage);
  };

  const applicableCompletedCount = workflow
    ? stageOrder.filter((s) => workflow.completedStages.includes(s)).length
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Workflow</CardTitle>
          <CardDescription>Partner onboarding progress</CardDescription>
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
          <CardTitle>Onboarding Workflow</CardTitle>
          <CardDescription>Partner onboarding progress</CardDescription>
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
              <CardTitle>{flowMeta.title}</CardTitle>
              <CardDescription>{flowMeta.description}</CardDescription>
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
                Stage {currentStageIndex + 1} of {stageOrder.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Overview */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Current Stage</p>
                <p className="text-lg font-bold">{STAGE_LABELS[workflow.currentStage]}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-lg font-bold">
                  {applicableCompletedCount} / {stageOrder.length} stages
                </p>
              </div>
            </div>

            {/* Stages Timeline */}
            <div className="space-y-3">
              {stageOrder.map((stage, index) => {
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
                    <div className="flex-shrink-0 mt-1">
                      {getStageIcon(status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{STAGE_LABELS[stage]}</h4>
                          <p className="text-sm text-muted-foreground">
                            {STAGE_DESCRIPTIONS[stage]}
                          </p>
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
                          {canEdit &&
                            (submitted ||
                              isCurrent ||
                              status === 'in_progress' ||
                              status === 'blocked' ||
                              adminOnlyStages.includes(stage)) && (
                            <Button
                              variant={isCurrent && status !== 'completed' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setReviewStage(stage)}
                            >
                              {adminOnlyStages.includes(stage) && isCurrent && !submitted
                                ? 'Approve step'
                                : 'Review'}
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStage(stage)}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Update
                            </Button>
                          )}
                        </div>
                      </div>
                      {stageData?.completedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed: {format(new Date(stageData.completedAt), 'MMM dd, yyyy')}
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

            {/* Workflow Notes */}
            {workflow.notes && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Workflow Notes</p>
                <p className="text-sm text-muted-foreground">{workflow.notes}</p>
              </div>
            )}

            {/* Timeline Info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
              <span>
                Started: {format(new Date(workflow.startedAt), 'MMM dd, yyyy')}
              </span>
              {workflow.completedAt && (
                <span>
                  Completed: {format(new Date(workflow.completedAt), 'MMM dd, yyyy')}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Stage Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Onboarding Stage</DialogTitle>
            <DialogDescription>
              {selectedStage && (
                <>
                  Update status for: <strong>{STAGE_LABELS[selectedStage]}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="Status"
              required
            >
              <Select
                value={updateStatus}
                onValueChange={(value) => setUpdateStatus(value as OnboardingStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormTextarea
              label="Notes (Optional)"
              value={updateNotes}
              onChange={(e) => setUpdateNotes(e.target.value)}
              placeholder="Add notes about this stage"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpdateDialogOpen(false);
                setUpdateNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSubmit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Stage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reviewStage && (
        <PartnerOnboardingStageReview
          partnerId={partnerId}
          stage={reviewStage}
          open={!!reviewStage}
          onOpenChange={(open) => !open && setReviewStage(null)}
          submittedForReview={
            (workflow.stages[reviewStage] as { submittedForReview?: boolean })?.submittedForReview
          }
        />
      )}
    </>
  );
}

