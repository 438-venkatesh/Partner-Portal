import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { onboardingApi, OnboardingStage } from '@/lib/api/onboarding';

import { serviceApi } from '@/lib/api/services';

import { partnerApi } from '@/lib/api/partners';

import { documentApi } from '@/lib/api/documents';

import { SERVICE_REQUIRED_DOCUMENTS } from '@/lib/serviceOnboardingConstants';
import { countMissingApprovedRequiredDocTypes } from '@/lib/onboardingReviewRequirements';

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

import { FormTextarea } from '@/components/ui/form-field';

import { Badge } from '@/components/ui/badge';

import { Alert, AlertDescription } from '@/components/ui/alert';

import { resolvePartnerAdminOnlyStages } from '@/lib/serviceOnboardingConstants';

import {

  AdminPartnerStageSubmissionPanel,

  getPartnerStageApproveHint,
  partnerStageBlocksApprove,

  isTrainingChecklistComplete,

  isTestingChecklistComplete,

} from './AdminPartnerStageSubmissionPanel';

import { Loader2 } from 'lucide-react';



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



interface Props {

  partnerId: string;

  stage: OnboardingStage;

  open: boolean;

  onOpenChange: (open: boolean) => void;

  submittedForReview?: boolean;

}



export function PartnerOnboardingStageReview({

  partnerId,

  stage,

  open,

  onOpenChange,

  submittedForReview,

}: Props) {

  const { toast } = useToast();

  const queryClient = useQueryClient();

  const [rejectReason, setRejectReason] = useState('');

  const [approveNotes, setApproveNotes] = useState('');



  const { data: workflow, isLoading } = useQuery({

    queryKey: ['onboarding', partnerId],

    queryFn: () => onboardingApi.getWorkflow(partnerId),

    enabled: open,

  });



  const stageEntry = workflow?.stages?.[stage];

  const stageData = (stageEntry?.stageData ?? stageEntry) as

    | {

        status?: string;

        submittedForReview?: boolean;

        submittedAt?: string;

        notes?: string;

        trainingCompleted?: boolean;

        pilotCompleted?: boolean;

        [key: string]: unknown;

      }

    | undefined;



  const resolvedSubmitted =

    submittedForReview === true ||

    stageEntry?.submittedForReview === true ||

    stageData?.submittedForReview === true;

  const isCompleted = stageEntry?.status === 'completed' || stageData?.status === 'completed';

  const isAdminOnly = workflow
    ? resolvePartnerAdminOnlyStages(workflow.partnerType ?? 'agency', workflow).includes(stage)
    : false;

  const canReviewBase =

    !isLoading &&

    !isCompleted &&

    (resolvedSubmitted || isAdminOnly || stageEntry?.status === 'blocked');



  const { data: relationshipsData } = useQuery({

    queryKey: ['partner-relationships', partnerId],

    queryFn: () => serviceApi.getPartnerRelationships(partnerId),

    enabled: open && (stage === 'service_selection' || stage === 'documentation' || stage === 'agreement'),

  });



  const { data: documents } = useQuery({

    queryKey: ['documents', partnerId],

    queryFn: () => documentApi.getPartnerDocuments(partnerId),

    enabled: open && stage === 'documentation',

  });



  const { data: agreementsData } = useQuery({

    queryKey: ['partners', partnerId, 'agreements'],

    queryFn: () => partnerApi.getAgreements(partnerId),

    enabled: open && stage === 'agreement',

  });



  const { data: portalUsersData } = useQuery({

    queryKey: ['partners', partnerId, 'portal-users'],

    queryFn: () => partnerApi.getPortalUsers(partnerId),

    enabled: open && stage === 'user_setup',

  });



  const reviewContext = useMemo(() => {

    const activeRelationships =

      relationshipsData?.relationships?.filter((r) => r.status === 'active').length ?? 0;

    const missingDocs = countMissingApprovedRequiredDocTypes(
      SERVICE_REQUIRED_DOCUMENTS,
      documents ?? []
    );

    const signedAgreements =

      agreementsData?.agreements?.filter((a) => a.status === 'signed').length ?? 0;

    return {

      activeRelationships,

      missingDocs,

      signedAgreements,

      portalUserCount: portalUsersData?.employees?.length ?? 0,

      trainingChecklistComplete: isTrainingChecklistComplete(stageData),

      testingChecklistComplete: isTestingChecklistComplete(stageData),

    };

  }, [relationshipsData, documents, agreementsData, portalUsersData, stageData]);



  const blocksApprove = partnerStageBlocksApprove(stage, reviewContext);

  const canReview = canReviewBase && !blocksApprove;

  const approveHint = getPartnerStageApproveHint(stage, reviewContext);



  const approveMutation = useMutation({

    mutationFn: () =>

      onboardingApi.approvePartnerStage(partnerId, stage, { notes: approveNotes || undefined }),

    onSuccess: () => {

      toast({ title: 'Stage approved' });

      queryClient.invalidateQueries({ queryKey: ['admin-onboarding-review-queue'] });

      queryClient.invalidateQueries({ queryKey: ['onboarding', partnerId] });

      onOpenChange(false);

    },

    onError: (e: unknown) => {

      const err = e as { response?: { data?: { message?: string } } };

      toast({ title: 'Approve failed', description: err?.response?.data?.message, variant: 'destructive' });

    },

  });



  const rejectMutation = useMutation({

    mutationFn: () => onboardingApi.rejectPartnerStage(partnerId, stage, rejectReason),

    onSuccess: () => {

      toast({ title: 'Stage rejected' });

      queryClient.invalidateQueries({ queryKey: ['admin-onboarding-review-queue'] });

      queryClient.invalidateQueries({ queryKey: ['onboarding', partnerId] });

      onOpenChange(false);

    },

    onError: (e: unknown) => {

      const err = e as { response?: { data?: { message?: string } } };

      toast({ title: 'Reject failed', description: err?.response?.data?.message, variant: 'destructive' });

    },

  });



  return (

    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">

        <DialogHeader>

          <DialogTitle>Review: {STAGE_LABELS[stage]}</DialogTitle>

          <DialogDescription>

            Review what the partner submitted below, then approve to advance or reject with feedback.

          </DialogDescription>

        </DialogHeader>



        {isLoading ? (

          <div className="flex justify-center py-8">

            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />

          </div>

        ) : (

          <div className="space-y-4">

            <div className="flex flex-wrap gap-2">

              {resolvedSubmitted && <Badge variant="secondary">Partner submitted</Badge>}

              {isAdminOnly && <Badge variant="outline">Ops step</Badge>}

              {stageEntry?.status === 'blocked' && <Badge variant="destructive">Blocked</Badge>}

            </div>



            {stageData?.submittedAt && (

              <p className="text-sm text-muted-foreground">

                Submitted: {new Date(String(stageData.submittedAt)).toLocaleString()}

              </p>

            )}



            {stageEntry?.notes && (

              <p className="text-sm text-muted-foreground border-l-2 pl-3">{stageEntry.notes}</p>

            )}



            <AdminPartnerStageSubmissionPanel

              partnerId={partnerId}

              stage={stage}

              stageData={stageData}

              workflow={workflow}

            />



            <Alert>

              <AlertDescription>{approveHint}</AlertDescription>

            </Alert>



            <FormTextarea

              label="Approval notes (optional)"

              value={approveNotes}

              onChange={(e) => setApproveNotes(e.target.value)}

              rows={2}

            />

            <FormTextarea

              label="Rejection reason"

              value={rejectReason}

              onChange={(e) => setRejectReason(e.target.value)}

              rows={2}

              placeholder="Required if rejecting"

            />

          </div>

        )}



        <DialogFooter className="gap-2 sm:gap-0">

          <Button variant="outline" onClick={() => onOpenChange(false)}>

            Cancel

          </Button>

          <Button

            variant="destructive"

            disabled={!rejectReason.trim() || rejectMutation.isPending || !canReviewBase}

            onClick={() => rejectMutation.mutate()}

          >

            Reject

          </Button>

          <Button

            disabled={approveMutation.isPending || !canReview}

            onClick={() => approveMutation.mutate()}

          >

            Approve &amp; advance

          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>

  );

}


