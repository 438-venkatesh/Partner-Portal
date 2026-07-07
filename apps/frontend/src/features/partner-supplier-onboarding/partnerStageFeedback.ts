/** Stages the partner cannot submit — operations completes them. */
export const SUPPLIER_ADMIN_REVIEW_STAGES = [
  'supplier_verification',
  'payment_setup',
  'supplier_activation',
] as const;

export type PartnerStageFeedbackKind =
  | 'rejected'
  | 'pending_review'
  | 'approved'
  | 'platform_review';

export interface PartnerStageFeedback {
  kind: PartnerStageFeedbackKind;
  message?: string;
}

interface StageInfoShape {
  status?: string;
  submittedForReview?: boolean;
  notes?: string;
  stageData?: Record<string, unknown>;
}

export type StageStatusLabelVariant = 'approved' | 'awaiting' | 'in_progress' | 'blocked' | 'pending';

export function getPriorStageStatusLabel(
  stage: string,
  workflow: {
    completedStages: string[];
    stages?: Record<string, StageInfoShape>;
  }
): { label: string; variant: StageStatusLabelVariant } {
  const info = workflow.stages?.[stage];
  if (workflow.completedStages.includes(stage) || info?.status === 'completed') {
    return { label: 'Approved', variant: 'approved' };
  }
  if (info?.status === 'blocked') {
    return { label: 'Changes requested', variant: 'blocked' };
  }
  if (info?.submittedForReview) {
    return { label: 'Awaiting review', variant: 'awaiting' };
  }
  if (info?.status === 'in_progress') {
    return { label: 'In progress', variant: 'in_progress' };
  }
  return { label: 'Not started', variant: 'pending' };
}

export function getStageReviewerNote(
  stage: string,
  workflow: { stages?: Record<string, StageInfoShape> }
): string | undefined {
  const info = workflow.stages?.[stage];
  const data = info?.stageData ?? {};
  const note = String(data.notes ?? info?.notes ?? '').trim();
  return note || undefined;
}

export function getPartnerStageFeedback(
  stage: string,
  workflow: {
    currentStage: string;
    completedStages: string[];
    notes?: string;
    stages?: Record<string, StageInfoShape>;
  },
  adminReviewStages: readonly string[] = SUPPLIER_ADMIN_REVIEW_STAGES
): PartnerStageFeedback | null {
  const info = workflow.stages?.[stage];
  if (!info) return null;

  const data = info.stageData ?? {};
  const rejection = String(data.rejectionNotes ?? '').trim();
  const reviewerNote = String(data.notes ?? info.notes ?? workflow.notes ?? '').trim();

  if (info.status === 'blocked' && (rejection || reviewerNote)) {
    return { kind: 'rejected', message: rejection || reviewerNote };
  }

  if (workflow.completedStages.includes(stage) || info.status === 'completed') {
    return {
      kind: 'approved',
      message: reviewerNote || undefined,
    };
  }

  if (info.submittedForReview) {
    return { kind: 'pending_review' };
  }

  if (
    adminReviewStages.includes(stage) &&
    workflow.currentStage === stage &&
    info.status === 'in_progress'
  ) {
    return { kind: 'platform_review' };
  }

  return null;
}
