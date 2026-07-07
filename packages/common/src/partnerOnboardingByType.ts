import {
  PARTNER_ONBOARDING_STAGE_ORDER,
  type PartnerOnboardingStageCode,
} from './schemas/partnerOnboarding';

export type ServicePartnerType =
  | 'agency'
  | 'reseller'
  | 'integrator'
  | 'consultant'
  | 'affiliate';

/** Stages the partner submits for ops review (subset varies by partner type). */
const SUBMIT_FOR_REVIEW_CANDIDATES: PartnerOnboardingStageCode[] = [
  'service_selection',
  'documentation',
  'agreement',
  'user_setup',
  'training',
  'testing',
];

/** Stages completed by operations (subset varies by partner type). */
const ADMIN_ONLY_CANDIDATES: PartnerOnboardingStageCode[] = [
  'initial_review',
  'verification',
  'app_access',
  'go_live',
];

export interface ServicePartnerOnboardingFlow {
  title: string;
  description: string;
  stageOrder: readonly PartnerOnboardingStageCode[];
}

/** Reseller and consultant share the same onboarding path. */
const RESELLER_CONSULTANT_ORDER: PartnerOnboardingStageCode[] = [
  'registration',
  'service_selection',
  'initial_review',
  'documentation',
  'verification',
  'agreement',
  'user_setup',
  'training',
  'go_live',
];

export const SERVICE_PARTNER_ONBOARDING_FLOWS: Record<
  ServicePartnerType,
  ServicePartnerOnboardingFlow
> = {
  agency: {
    title: 'Agency onboarding',
    description:
      'Full agency path: program selection, compliance, portal access, training, pilot, and go-live.',
    stageOrder: [...PARTNER_ONBOARDING_STAGE_ORDER],
  },
  reseller: {
    title: 'Reseller onboarding',
    description:
      'Reseller path: tenant programs, compliance, team setup, training, and activation (no integration sandbox).',
    stageOrder: RESELLER_CONSULTANT_ORDER,
  },
  consultant: {
    title: 'Consultant onboarding',
    description:
      'Same steps as reseller: advisory delivery without integration sandbox or app-access provisioning.',
    stageOrder: RESELLER_CONSULTANT_ORDER,
  },
  integrator: {
    title: 'Integrator onboarding',
    description:
      'Technical partner path: integrations, application access, user setup, pilot testing, and go-live.',
    stageOrder: [
      'registration',
      'service_selection',
      'initial_review',
      'documentation',
      'verification',
      'agreement',
      'app_access',
      'user_setup',
      'testing',
      'go_live',
    ],
  },
  affiliate: {
    title: 'Affiliate onboarding',
    description:
      'Referral partner path: registration, review, documents, agreement, users, and go-live.',
    stageOrder: [
      'registration',
      'initial_review',
      'documentation',
      'agreement',
      'user_setup',
      'go_live',
    ],
  },
};

export function isServicePartnerType(partnerType: string): partnerType is ServicePartnerType {
  return partnerType in SERVICE_PARTNER_ONBOARDING_FLOWS;
}

export function getServicePartnerOnboardingFlow(partnerType: string): ServicePartnerOnboardingFlow {
  if (isServicePartnerType(partnerType)) {
    return SERVICE_PARTNER_ONBOARDING_FLOWS[partnerType];
  }
  return SERVICE_PARTNER_ONBOARDING_FLOWS.agency;
}

export function getPartnerOnboardingStageOrder(
  partnerType: string
): readonly PartnerOnboardingStageCode[] {
  return getServicePartnerOnboardingFlow(partnerType).stageOrder;
}

export function isPartnerOnboardingStageApplicable(
  partnerType: string,
  stage: PartnerOnboardingStageCode
): boolean {
  return getPartnerOnboardingStageOrder(partnerType).includes(stage);
}

export function getPartnerSubmitForReviewStages(
  partnerType: string
): PartnerOnboardingStageCode[] {
  const order = new Set(getPartnerOnboardingStageOrder(partnerType));
  return SUBMIT_FOR_REVIEW_CANDIDATES.filter((s) => order.has(s));
}

export function getPartnerAdminOnlyStages(partnerType: string): PartnerOnboardingStageCode[] {
  const order = new Set(getPartnerOnboardingStageOrder(partnerType));
  return ADMIN_ONLY_CANDIDATES.filter((s) => order.has(s));
}

export function buildInitialPartnerOnboardingState(partnerType: string) {
  const order = getPartnerOnboardingStageOrder(partnerType);
  const completedStages: string[] = [];
  const stageData: Record<string, { status: string }> = {};

  for (const stage of PARTNER_ONBOARDING_STAGE_ORDER) {
    if (order.includes(stage)) {
      stageData[stage] = { status: stage === order[0] ? 'in_progress' : 'pending' };
    } else {
      completedStages.push(stage);
      stageData[stage] = { status: 'skipped' };
    }
  }

  return {
    currentStage: order[0],
    stageStatus: 'in_progress' as const,
    completedStages,
    stageData,
  };
}

export function isPartnerOnboardingCompleteForType(
  partnerType: string,
  completedStages: string[],
  stages?: Record<string, { status?: string }>
): boolean {
  const order = getPartnerOnboardingStageOrder(partnerType);
  return order.every((stage) => {
    if (completedStages.includes(stage)) return true;
    return stages?.[stage]?.status === 'skipped';
  });
}
