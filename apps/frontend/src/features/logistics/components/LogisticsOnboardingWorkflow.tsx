import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi, LogisticsOnboardingStage, OnboardingStatus } from '@/lib/api/onboarding';
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

interface LogisticsOnboardingWorkflowProps {
  logisticsId: string;
  partnerId?: string;
  canEdit?: boolean;
}

const STAGE_LABELS: Record<LogisticsOnboardingStage, string> = {
  logistics_registration: 'Logistics Registration',
  fleet_setup: 'Fleet & Infrastructure Setup',
  logistics_documentation: 'Document Upload',
  logistics_verification: 'Verification & Review',
  logistics_agreement: 'Logistics Agreement',
  api_integration: 'API Integration',
  logistics_portal_access: 'Portal Access & Training',
  logistics_testing: 'Testing & Validation',
  logistics_activation: 'Logistics Activation',
};

const STAGE_DESCRIPTIONS: Record<LogisticsOnboardingStage, string> = {
  logistics_registration: 'Logistics partner registration and basic information',
  fleet_setup: 'Register fleet vehicles and warehouse locations',
  logistics_documentation: 'Upload required documents and licenses',
  logistics_verification: 'Document verification and review',
  logistics_agreement: 'Sign logistics agreement',
  api_integration: 'Setup tracking API integration (optional)',
  logistics_portal_access: 'Complete portal training and testing',
  logistics_testing: 'Test shipment workflows and tracking',
  logistics_activation: 'Final activation and go live',
};

const STAGE_ORDER: LogisticsOnboardingStage[] = [
  'logistics_registration',
  'fleet_setup',
  'logistics_documentation',
  'logistics_verification',
  'logistics_agreement',
  'api_integration',
  'logistics_portal_access',
  'logistics_testing',
  'logistics_activation',
];

export function LogisticsOnboardingWorkflow({ logisticsId, partnerId, canEdit = false }: LogisticsOnboardingWorkflowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<LogisticsOnboardingStage | null>(null);
  const [updateStatus, setUpdateStatus] = useState<OnboardingStatus>('in_progress');
  const [updateNotes, setUpdateNotes] = useState('');

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['logistics-onboarding', logisticsId],
    queryFn: () => onboardingApi.getLogisticsWorkflow(logisticsId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { stage: LogisticsOnboardingStage; status: OnboardingStatus; notes?: string }) =>
      onboardingApi.updateLogisticsStage(logisticsId, data),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Onboarding stage updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['logistics-onboarding', logisticsId] });
      if (partnerId) {
        queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'activation-readiness'] });
      }
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

  const handleUpdateStage = (stage: LogisticsOnboardingStage) => {
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

  const getStageStatus = (stage: LogisticsOnboardingStage): OnboardingStatus => {
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
          <CardTitle>Logistics Onboarding Workflow</CardTitle>
          <CardDescription>Logistics partner onboarding progress</CardDescription>
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
          <CardTitle>Logistics Onboarding Workflow</CardTitle>
          <CardDescription>Logistics partner onboarding progress</CardDescription>
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
              <CardTitle>Logistics Onboarding Workflow</CardTitle>
              <CardDescription>Logistics partner onboarding progress</CardDescription>
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
            {/* Progress Overview */}
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

            {/* Stages Timeline */}
            <div className="space-y-3">
              {STAGE_ORDER.map((stage, index) => {
                const status = getStageStatus(stage);
                const isCurrent = workflow.currentStage === stage;
                const isPast = index < currentStageIndex;
                const stageData = workflow.stages[stage];

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
          </div>
        </CardContent>
      </Card>

      {/* Update Stage Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Onboarding Stage</DialogTitle>
            <DialogDescription>
              Update the status of {selectedStage && STAGE_LABELS[selectedStage]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Status">
              <Select value={updateStatus} onValueChange={(value) => setUpdateStatus(value as OnboardingStatus)}>
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
              label="Notes"
              value={updateNotes}
              onChange={(e) => setUpdateNotes(e.target.value)}
              placeholder="Add notes about this stage..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Stage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

