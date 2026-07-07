import type { OnboardingStage } from '@/lib/api/onboarding';
import { ONBOARDING_TRACK_CONFIG } from '@/lib/partnerOnboardingStages';
import {
  getPartnerAdminOnlyStages,
  getPartnerOnboardingStageOrder,
} from '@/lib/partnerOnboardingByType';

/** Stages ops completes when current (mirrors supplier verification/payment/activation). */
export const PARTNER_ADMIN_ONLY_STAGES: OnboardingStage[] = [
  'initial_review',
  'verification',
  'app_access',
  'go_live',
];

export function resolveServiceStageOrder(
  partnerType: string,
  workflow?: { stageOrder?: readonly string[] }
): readonly OnboardingStage[] {
  if (workflow?.stageOrder?.length) {
    return workflow.stageOrder as OnboardingStage[];
  }
  return getPartnerOnboardingStageOrder(partnerType) as OnboardingStage[];
}

export function resolvePartnerAdminOnlyStages(
  partnerType: string,
  workflow?: { stageOrder?: readonly string[] }
): OnboardingStage[] {
  const order = resolveServiceStageOrder(partnerType, workflow);
  return getPartnerAdminOnlyStages(partnerType).filter((s) => order.includes(s));
}

export function serviceStageMeta(stage: OnboardingStage) {
  return ONBOARDING_TRACK_CONFIG.service.stageCopy[stage];
}

export function serviceStageRoute(stage: OnboardingStage) {
  return `/partner/onboarding/service/${stage}` as const;
}

export type StageAccess = 'locked' | 'editable' | 'completed' | 'readonly';

export function getServiceStageAccess(
  stage: OnboardingStage,
  workflow: {
    currentStage: string;
    completedStages: string[];
    stages?: Record<string, { status?: string; submittedForReview?: boolean }>;
    stageOrder?: readonly string[];
  },
  partnerType: string
): StageAccess {
  const stageOrder = resolveServiceStageOrder(partnerType, workflow);
  const adminOnly = resolvePartnerAdminOnlyStages(partnerType, workflow);

  if (!stageOrder.includes(stage)) return 'locked';
  if (workflow.completedStages.includes(stage)) return 'completed';
  const status = workflow.stages?.[stage]?.status;
  if (status === 'blocked') return 'editable';
  if (adminOnly.includes(stage)) {
    if (workflow.currentStage === stage) return 'readonly';
    const stageIdx = stageOrder.indexOf(stage);
    const currentIdx = stageOrder.indexOf(workflow.currentStage as OnboardingStage);
    if (stageIdx >= 0 && currentIdx >= 0 && stageIdx < currentIdx) return 'readonly';
    return 'locked';
  }
  if (workflow.currentStage === stage) return 'editable';
  if (status === 'in_progress') return 'editable';
  const stageIdx = stageOrder.indexOf(stage);
  const currentIdx = stageOrder.indexOf(workflow.currentStage as OnboardingStage);
  if (stageIdx >= 0 && currentIdx >= 0 && stageIdx < currentIdx) return 'readonly';
  if (stageIdx === currentIdx) return 'editable';
  return 'locked';
}

export const SERVICE_REQUIRED_DOCUMENTS = [
  { type: 'business_license', label: 'Business license' },
  { type: 'tax_certificate', label: 'Tax certificate' },
  { type: 'insurance_certificate', label: 'Insurance certificate' },
] as const;
