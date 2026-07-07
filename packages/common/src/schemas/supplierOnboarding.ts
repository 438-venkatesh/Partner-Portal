import { z } from 'zod';

export const SUPPLIER_ONBOARDING_STAGE_ORDER = [
  'supplier_registration',
  'catalog_setup',
  'supplier_documentation',
  'supplier_verification',
  'supplier_agreement',
  'payment_setup',
  'supplier_portal_access',
  'supplier_activation',
] as const;

export type SupplierOnboardingStageCode = (typeof SUPPLIER_ONBOARDING_STAGE_ORDER)[number];

export const SUPPLIER_ONBOARDING_STATUS = [
  'pending',
  'in_progress',
  'completed',
  'blocked',
  'skipped',
] as const;

export type SupplierOnboardingStatus = (typeof SUPPLIER_ONBOARDING_STATUS)[number];

/** Required document types for supplier_documentation stage */
export const SUPPLIER_REQUIRED_DOCUMENT_TYPES = [
  'business_license',
  'tax_certificate',
  'quality_certification',
  'insurance_certificate',
  'compliance_document',
] as const;

export const SUPPLIER_CATALOG_MIN_PRODUCTS = 5;

export const supplierOnboardingStageSchema = z.enum(SUPPLIER_ONBOARDING_STAGE_ORDER);

export const saveStageDraftSchema = z.object({
  stage: supplierOnboardingStageSchema,
  payload: z.record(z.unknown()).optional(),
});

export const submitStageSchema = z.object({
  stage: supplierOnboardingStageSchema,
});

export const approveStageSchema = z.object({
  notes: z.string().optional(),
  stageData: z.record(z.unknown()).optional(),
});

export const rejectStageSchema = z.object({
  reason: z.string().min(1),
});

export const updateSupplierProfileSchema = z.object({
  supplierCategory: z
    .enum(['raw_materials', 'components', 'finished_goods', 'mro', 'services', 'other'])
    .optional(),
  supplyRegions: z.array(z.string()).optional(),
  leadTimeDays: z.number().int().positive().optional(),
  minimumOrderQuantity: z.number().positive().optional(),
  productCatalogUrl: z.string().url().optional().or(z.literal('')),
  paymentTerms: z.string().optional(),
  acceptedTerms: z.boolean().optional(),
});

export const portalTrainingChecklistSchema = z.object({
  trainingCompleted: z.boolean(),
  poWorkflowUnderstood: z.boolean(),
  invoiceFlowUnderstood: z.boolean(),
  notes: z.string().optional(),
});
