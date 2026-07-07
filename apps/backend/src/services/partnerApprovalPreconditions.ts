import { db } from '../db';
import { partners } from '../db/schema/partners';
import { eq } from 'drizzle-orm';
import { onboardingService, isPartnerOnboardingComplete } from './onboardingService';
import { supplierOnboardingService, isSupplierOnboardingComplete } from './supplierOnboardingService';
import { logisticsOnboardingService, isLogisticsOnboardingComplete } from './logisticsOnboardingService';
import { supplierService } from './supplierService';
import { logisticsService } from './logisticsService';

export function partnerTypeFlags(partnerType: string) {
  return {
    needsGenericOnboarding:
      partnerType === 'agency' ||
      partnerType === 'reseller' ||
      partnerType === 'integrator' ||
      partnerType === 'consultant' ||
      partnerType === 'affiliate',
    needsSupplierOnboarding: partnerType === 'supplier' || partnerType === 'supplier_logistics',
    needsLogisticsOnboarding: partnerType === 'logistics_partner' || partnerType === 'supplier_logistics',
  };
}

/** Human-readable reasons why a pending partner cannot be approved yet (empty = ready). */
export async function getPartnerActivationBlockers(partnerId: string): Promise<string[]> {
  const [partner] = await db
    .select({ partnerId: partners.partnerId, partnerType: partners.partnerType })
    .from(partners)
    .where(eq(partners.partnerId, partnerId))
    .limit(1);

  if (!partner) return ['Partner not found.'];

  const blockers: string[] = [];
  const flags = partnerTypeFlags(partner.partnerType);

  if (flags.needsGenericOnboarding) {
    const wf = await onboardingService.getWorkflow(partnerId);
    if (!isPartnerOnboardingComplete(wf, partner.partnerType)) {
      const flowLabel = wf.flowTitle ?? 'partner onboarding';
      blockers.push(
        `Finish ${flowLabel} (all required stages for your partner type) before approving.`
      );
    }
  }

  if (flags.needsSupplierOnboarding) {
    const sup = await supplierService.getSupplierByPartnerId(partnerId);
    if (!sup) {
      blockers.push('Create the supplier record and complete supplier onboarding before approving.');
    } else {
      const wf = await supplierOnboardingService.getWorkflow(sup.supplierId);
      if (!isSupplierOnboardingComplete(wf)) {
        blockers.push('Complete all supplier onboarding stages before approving.');
      }
    }
  }

  if (flags.needsLogisticsOnboarding) {
    const log = await logisticsService.getLogisticsByPartnerId(partnerId);
    if (!log) {
      blockers.push('Create the logistics partner record and complete logistics onboarding before approving.');
    } else {
      const wf = await logisticsOnboardingService.getWorkflow(log.logisticsId);
      if (!isLogisticsOnboardingComplete(wf)) {
        blockers.push('Complete all logistics onboarding stages before approving.');
      }
    }
  }

  return blockers;
}
