/** Mirrors apps/backend/src/services/partnerApprovalPreconditions.ts */

export function partnerTypeFlags(partnerType: string | undefined | null) {
  const t = partnerType ?? '';
  return {
    needsGenericOnboarding:
      t === 'agency' ||
      t === 'reseller' ||
      t === 'integrator' ||
      t === 'consultant' ||
      t === 'affiliate',
    needsSupplierOnboarding: t === 'supplier' || t === 'supplier_logistics',
    needsLogisticsOnboarding: t === 'logistics_partner' || t === 'supplier_logistics',
  };
}

/** Tenant timelines & service relationships — service partner types only. */
export function hasServicePartnerClientPortal(partnerType: string | undefined | null): boolean {
  return partnerTypeFlags(partnerType).needsGenericOnboarding;
}

/** Supplier catalog & supplier onboarding nav — supplier + supplier_logistics. */
export function hasSupplierPortalNav(partnerType: string | undefined | null): boolean {
  return partnerTypeFlags(partnerType).needsSupplierOnboarding;
}

/** Logistics onboarding nav — logistics_partner + supplier_logistics. */
export function hasLogisticsPortalNav(partnerType: string | undefined | null): boolean {
  return partnerTypeFlags(partnerType).needsLogisticsOnboarding;
}

/** Generic 11-stage onboarding link under Organization — service types only. */
export function hasGenericOnboardingNav(partnerType: string | undefined | null): boolean {
  return partnerTypeFlags(partnerType).needsGenericOnboarding;
}
