/**
 * Partner-type onboarding stage order (mirrors packages/common/src/partnerOnboardingByType.ts).
 * Kept in the frontend to avoid Vite loading CJS @partner-portal/common dist without named ESM exports.
 */
import type { OnboardingStage } from '@/lib/api/onboarding';

export type ServicePartnerType =
  | 'agency'
  | 'reseller'
  | 'integrator'
  | 'consultant'
  | 'affiliate';

const ALL_STAGES: OnboardingStage[] = [
  'registration',
  'service_selection',
  'initial_review',
  'documentation',
  'verification',
  'agreement',
  'app_access',
  'user_setup',
  'training',
  'testing',
  'go_live',
];

const SUBMIT_FOR_REVIEW_CANDIDATES: OnboardingStage[] = [
  'service_selection',
  'documentation',
  'agreement',
  'user_setup',
  'training',
  'testing',
];

const ADMIN_ONLY_CANDIDATES: OnboardingStage[] = [
  'initial_review',
  'verification',
  'app_access',
  'go_live',
];

export interface ServicePartnerOnboardingFlow {
  title: string;
  description: string;
  stageOrder: readonly OnboardingStage[];
}

const RESELLER_CONSULTANT_ORDER: OnboardingStage[] = [
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
    stageOrder: ALL_STAGES,
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

export function getPartnerOnboardingStageOrder(partnerType: string): readonly OnboardingStage[] {
  return getServicePartnerOnboardingFlow(partnerType).stageOrder;
}

export function isPartnerOnboardingStageApplicable(
  partnerType: string,
  stage: OnboardingStage
): boolean {
  return getPartnerOnboardingStageOrder(partnerType).includes(stage);
}

export function getPartnerSubmitForReviewStages(partnerType: string): OnboardingStage[] {
  const order = new Set(getPartnerOnboardingStageOrder(partnerType));
  return SUBMIT_FOR_REVIEW_CANDIDATES.filter((s) => order.has(s));
}

export function getPartnerAdminOnlyStages(partnerType: string): OnboardingStage[] {
  const order = new Set(getPartnerOnboardingStageOrder(partnerType));
  return ADMIN_ONLY_CANDIDATES.filter((s) => order.has(s));
}
