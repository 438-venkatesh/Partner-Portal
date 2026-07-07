import type { SupplierOnboardingStage } from '@/lib/api/onboarding';
import { ONBOARDING_TRACK_CONFIG } from '@/lib/partnerOnboardingStages';

export const SUPPLIER_STAGE_ORDER = ONBOARDING_TRACK_CONFIG.supplier
  .stageOrder as readonly SupplierOnboardingStage[];

export const SUPPLIER_MIN_CATALOG_PRODUCTS = 5;

export const SUPPLIER_REQUIRED_DOCUMENTS = [
  { type: 'business_license', label: 'Business license', description: 'Valid business registration or license' },
  { type: 'tax_certificate', label: 'Tax certificate', description: 'Tax ID or VAT registration' },
  { type: 'quality_certification', label: 'Quality certification', description: 'ISO or industry quality certs' },
  { type: 'insurance_certificate', label: 'Insurance certificate', description: 'Liability or product insurance' },
  { type: 'compliance_document', label: 'Compliance document', description: 'Regulatory or trade compliance' },
] as const;

/** Compact labels for the step strip (avoids truncation). */
export const SUPPLIER_STAGE_SHORT_LABELS: Record<SupplierOnboardingStage, string> = {
  supplier_registration: 'Register',
  catalog_setup: 'Catalog',
  supplier_documentation: 'Documents',
  supplier_verification: 'Review',
  supplier_agreement: 'Agreement',
  payment_setup: 'Payment',
  supplier_portal_access: 'Training',
  supplier_activation: 'Go live',
};

export function supplierStageMeta(stage: SupplierOnboardingStage) {
  return ONBOARDING_TRACK_CONFIG.supplier.stageCopy[stage];
}

export function supplierStageShortLabel(stage: SupplierOnboardingStage) {
  return SUPPLIER_STAGE_SHORT_LABELS[stage];
}

export function supplierStageIndex(stage: SupplierOnboardingStage): number {
  return SUPPLIER_STAGE_ORDER.indexOf(stage);
}

export function supplierStageRoute(stage: SupplierOnboardingStage) {
  return `/partner/onboarding/supplier/${stage}` as const;
}

export type StageAccess = 'locked' | 'editable' | 'completed' | 'readonly';

const ADMIN_REVIEW_STAGES: SupplierOnboardingStage[] = [
  'supplier_verification',
  'payment_setup',
  'supplier_activation',
];

export function getSupplierStageAccess(
  stage: SupplierOnboardingStage,
  workflow: {
    currentStage: string;
    completedStages: string[];
    stages?: Record<string, { status?: string }>;
  }
): StageAccess {
  if (workflow.completedStages.includes(stage)) return 'completed';
  const status = workflow.stages?.[stage]?.status;
  if (status === 'blocked') return 'editable';
  if (ADMIN_REVIEW_STAGES.includes(stage)) {
    if (workflow.currentStage === stage) return 'readonly';
    const stageIdx = supplierStageIndex(stage);
    const currentIdx = supplierStageIndex(workflow.currentStage as SupplierOnboardingStage);
    if (stageIdx < currentIdx) return 'readonly';
    return 'locked';
  }
  if (workflow.currentStage === stage) return 'editable';
  if (status === 'in_progress') return 'editable';
  const stageIdx = supplierStageIndex(stage);
  const currentIdx = supplierStageIndex(workflow.currentStage as SupplierOnboardingStage);
  if (stageIdx < currentIdx) return 'readonly';
  if (stageIdx === currentIdx) return 'editable';
  return 'locked';
}
