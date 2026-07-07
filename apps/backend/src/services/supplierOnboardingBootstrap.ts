import { db } from '../db';
import { partners } from '../db/schema/partners';
import { suppliers } from '../db/schema/suppliers';
import { supplierOnboardingWorkflows } from '../db/schema/advanced';
import { eq } from 'drizzle-orm';
import { partnerTypeFlags } from './partnerApprovalPreconditions';

export function isSupplierPartnerType(partnerType: string): boolean {
  return partnerTypeFlags(partnerType).needsSupplierOnboarding;
}

/**
 * Ensures suppliers row + supplier_onboarding_workflows exist for supplier / supplier_logistics partners.
 */
export async function ensureSupplierOnboarding(partnerId: string, partnerType?: string) {
  let type = partnerType;
  if (!type) {
    const [p] = await db
      .select({ partnerType: partners.partnerType })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);
    if (!p) throw new Error('Partner not found');
    type = p.partnerType;
  }

  if (!isSupplierPartnerType(type)) {
    return null;
  }

  let [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.partnerId, partnerId))
    .limit(1);

  if (!supplier) {
    const [row] = await db
      .insert(suppliers)
      .values({
        partnerId,
        supplierCode: `SUP-${Date.now().toString(36).slice(-6).toUpperCase()}`,
        supplierCategory: 'other',
        supplierPortalEnabled: true,
      })
      .returning();
    supplier = row;
  }

  const [existingWf] = await db
    .select()
    .from(supplierOnboardingWorkflows)
    .where(eq(supplierOnboardingWorkflows.supplierId, supplier.supplierId))
    .limit(1);

  if (!existingWf) {
    await db.insert(supplierOnboardingWorkflows).values({
      supplierId: supplier.supplierId,
      currentStage: 'supplier_registration',
      stageStatus: 'in_progress',
      completedStages: [],
      stageData: {
        supplier_registration: { status: 'in_progress' },
      },
      startedAt: new Date(),
    });
  }

  return { supplierId: supplier.supplierId, supplier };
}

