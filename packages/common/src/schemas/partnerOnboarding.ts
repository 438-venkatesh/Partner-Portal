import { z } from 'zod';

export const PARTNER_ONBOARDING_STAGE_ORDER = [
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
] as const;

export type PartnerOnboardingStageCode = (typeof PARTNER_ONBOARDING_STAGE_ORDER)[number];

export const partnerOnboardingStageSchema = z.enum(PARTNER_ONBOARDING_STAGE_ORDER);

export const partnerSaveStageDraftSchema = z.object({
  stage: partnerOnboardingStageSchema,
  payload: z.record(z.unknown()).optional(),
});

export const partnerSubmitStageSchema = z.object({
  stage: partnerOnboardingStageSchema,
  acceptedTerms: z.literal(true).optional(),
  displayName: z.string().max(200).optional(),
  website: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
});

export const PARTNER_REQUIRED_DOCUMENT_TYPES = [
  'business_license',
  'tax_certificate',
  'insurance_certificate',
] as const;
