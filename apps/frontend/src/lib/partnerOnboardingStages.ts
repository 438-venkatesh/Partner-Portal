/** Stage metadata aligned with Operations portal onboarding workflows. */

export type PartnerOnboardingTrack = 'service' | 'supplier' | 'logistics';

export interface OnboardingStageMeta {
  title: string;
  hint: string;
  link?: { to: string; label: string; params?: Record<string, string> };
}

const SERVICE_STAGES = [
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

const SUPPLIER_STAGES = [
  'supplier_registration',
  'catalog_setup',
  'supplier_documentation',
  'supplier_verification',
  'supplier_agreement',
  'payment_setup',
  'supplier_portal_access',
  'supplier_activation',
] as const;

const LOGISTICS_STAGES = [
  'logistics_registration',
  'fleet_setup',
  'logistics_documentation',
  'logistics_verification',
  'logistics_agreement',
  'api_integration',
  'logistics_portal_access',
  'logistics_testing',
  'logistics_activation',
] as const;

const SERVICE_STAGE_LINK = (stage: string, label: string) => ({
  to: '/partner/onboarding/service/$stage' as const,
  params: { stage },
  label,
});

const SERVICE_COPY: Record<(typeof SERVICE_STAGES)[number], OnboardingStageMeta> = {
  registration: {
    title: 'Registration',
    hint: 'Company profile and account setup.',
    link: SERVICE_STAGE_LINK('registration', 'Complete registration'),
  },
  service_selection: {
    title: 'Service selection',
    hint: 'Choose programs and SKUs you will deliver with tenants.',
    link: SERVICE_STAGE_LINK('service_selection', 'Submit for review'),
  },
  initial_review: { title: 'Initial review', hint: 'Platform review of your submission.' },
  documentation: {
    title: 'Documentation',
    hint: 'Upload licenses, tax forms, and compliance files.',
    link: SERVICE_STAGE_LINK('documentation', 'Upload documents'),
  },
  verification: { title: 'Verification', hint: 'Identity and business checks.' },
  agreement: {
    title: 'Agreements',
    hint: 'Review and sign partner agreements.',
    link: SERVICE_STAGE_LINK('agreement', 'View agreements'),
  },
  app_access: {
    title: 'Application access',
    hint: 'Enable integrations and API access where applicable.',
    link: { to: '/partner/settings', label: 'Open settings' },
  },
  user_setup: {
    title: 'User setup',
    hint: 'Invite staff and assign roles.',
    link: SERVICE_STAGE_LINK('user_setup', 'Manage employees'),
  },
  training: {
    title: 'Training',
    hint: 'Complete enablement sessions.',
    link: SERVICE_STAGE_LINK('training', 'Complete training'),
  },
  testing: {
    title: 'Testing',
    hint: 'Pilot workflows with a tenant.',
    link: SERVICE_STAGE_LINK('testing', 'Submit testing'),
  },
  go_live: { title: 'Go live', hint: 'Production readiness sign-off.' },
};

const SUPPLIER_STAGE_LINK = (stage: string, label: string) => ({
  to: '/partner/onboarding/supplier/$stage' as const,
  params: { stage },
  label,
});

const SUPPLIER_COPY: Record<(typeof SUPPLIER_STAGES)[number], OnboardingStageMeta> = {
  supplier_registration: {
    title: 'Registration',
    hint: 'Company profile and account setup.',
    link: SUPPLIER_STAGE_LINK('supplier_registration', 'Complete registration'),
  },
  catalog_setup: {
    title: 'Catalog setup',
    hint: 'Create and set up your product catalog (minimum 5 products).',
    link: SUPPLIER_STAGE_LINK('catalog_setup', 'Manage catalog'),
  },
  supplier_documentation: {
    title: 'Document upload',
    hint: 'Upload required supplier documents.',
    link: SUPPLIER_STAGE_LINK('supplier_documentation', 'Upload documents'),
  },
  supplier_verification: {
    title: 'Verification & review',
    hint: 'Document verification and platform review.',
    link: SUPPLIER_STAGE_LINK('supplier_verification', 'View status'),
  },
  supplier_agreement: {
    title: 'Supplier agreement',
    hint: 'Review and sign the supplier agreement.',
    link: SUPPLIER_STAGE_LINK('supplier_agreement', 'View agreements'),
  },
  payment_setup: {
    title: 'Payment & terms',
    hint: 'Payment terms configured by operations.',
    link: SUPPLIER_STAGE_LINK('payment_setup', 'View terms'),
  },
  supplier_portal_access: {
    title: 'Portal access & training',
    hint: 'Complete portal training and testing.',
    link: SUPPLIER_STAGE_LINK('supplier_portal_access', 'Complete checklist'),
  },
  supplier_activation: {
    title: 'Supplier activation',
    hint: 'Final activation and go live.',
    link: SUPPLIER_STAGE_LINK('supplier_activation', 'View status'),
  },
};

const LOGISTICS_COPY: Record<(typeof LOGISTICS_STAGES)[number], OnboardingStageMeta> = {
  logistics_registration: {
    title: 'Logistics registration',
    hint: 'Logistics partner registration and basic information.',
  },
  fleet_setup: { title: 'Fleet & infrastructure', hint: 'Register fleet vehicles and warehouse locations with operations.' },
  logistics_documentation: {
    title: 'Document upload',
    hint: 'Upload required documents and licenses.',
    link: { to: '/partner/documents', label: 'Open documents' },
  },
  logistics_verification: { title: 'Verification & review', hint: 'Document verification and platform review.' },
  logistics_agreement: {
    title: 'Logistics agreement',
    hint: 'Review and sign the logistics agreement.',
    link: { to: '/partner/agreements', label: 'View agreements' },
  },
  api_integration: {
    title: 'API integration',
    hint: 'Set up tracking API integration (optional).',
    link: { to: '/partner/settings', label: 'Open settings' },
  },
  logistics_portal_access: {
    title: 'Portal access & training',
    hint: 'Complete portal training and testing.',
    link: { to: '/partner/settings', label: 'Open settings' },
  },
  logistics_testing: { title: 'Testing & validation', hint: 'Test shipment workflows and tracking.' },
  logistics_activation: { title: 'Logistics activation', hint: 'Final activation and go live.' },
};

export const ONBOARDING_TRACK_CONFIG: Record<
  PartnerOnboardingTrack,
  { title: string; description: string; stageOrder: readonly string[]; stageCopy: Record<string, OnboardingStageMeta> }
> = {
  service: {
    title: 'Partner onboarding',
    description: 'Service partner journey from registration to go-live.',
    stageOrder: SERVICE_STAGES,
    stageCopy: SERVICE_COPY,
  },
  supplier: {
    title: 'Supplier onboarding',
    description: 'Supplier-specific onboarding from registration through activation.',
    stageOrder: SUPPLIER_STAGES,
    stageCopy: SUPPLIER_COPY,
  },
  logistics: {
    title: 'Logistics onboarding',
    description: 'Logistics partner onboarding from registration through activation.',
    stageOrder: LOGISTICS_STAGES,
    stageCopy: LOGISTICS_COPY,
  },
};

export function onboardingTracksForPartnerType(partnerType: string): PartnerOnboardingTrack[] {
  const tracks: PartnerOnboardingTrack[] = [];
  if (
    partnerType === 'agency' ||
    partnerType === 'reseller' ||
    partnerType === 'integrator' ||
    partnerType === 'consultant' ||
    partnerType === 'affiliate'
  ) {
    tracks.push('service');
  }
  if (partnerType === 'supplier' || partnerType === 'supplier_logistics') {
    tracks.push('supplier');
  }
  if (partnerType === 'logistics_partner' || partnerType === 'supplier_logistics') {
    tracks.push('logistics');
  }
  return tracks;
}

export function partnerTypeLabel(partnerType: string): string {
  const labels: Record<string, string> = {
    agency: 'Agency',
    reseller: 'Reseller',
    integrator: 'Integrator',
    consultant: 'Consultant',
    affiliate: 'Affiliate',
    supplier: 'Supplier',
    logistics_partner: 'Logistics partner',
    supplier_logistics: 'Supplier & logistics',
  };
  return labels[partnerType] ?? partnerType;
}
