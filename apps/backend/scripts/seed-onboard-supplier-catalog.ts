/**
 * Ensures onboard.supplier@example.com has 5 catalog products and is on catalog_setup stage.
 * Run: pnpm --filter @partner-portal/backend exec tsx scripts/seed-onboard-supplier-catalog.ts
 */
import 'dotenv/config';
import { db } from '../src/db';
import { partners } from '../src/db/schema/partners';
import { partnerUserAccounts } from '../src/db/schema/partnerAuth';
import { suppliers } from '../src/db/schema/suppliers';
import { supplierProducts } from '../src/db/schema/products';
import { supplierOnboardingWorkflows } from '../src/db/schema/advanced';
import { eq, and, like, or } from 'drizzle-orm';
import { SUPPLIER_ONBOARDING_STAGE_ORDER } from '@partner-portal/common';

const PARTNER_EMAIL = 'onboard.supplier@example.com';

const CATALOG_PRODUCTS = [
  { code: 'OTS-SKU-001', name: 'Industrial bolt kit M8', category: 'components' as const, price: '24.99' },
  { code: 'OTS-SKU-002', name: 'Stainless steel washer pack', category: 'mro' as const, price: '12.50' },
  { code: 'OTS-SKU-003', name: 'Hydraulic hose assembly', category: 'finished_goods' as const, price: '89.00' },
  { code: 'OTS-SKU-004', name: 'Safety gloves (box of 100)', category: 'mro' as const, price: '45.00' },
  { code: 'OTS-SKU-005', name: 'Aluminum mounting bracket', category: 'components' as const, price: '18.75' },
];

async function main() {
  const [account] = await db
    .select({ partnerId: partnerUserAccounts.partnerId })
    .from(partnerUserAccounts)
    .where(eq(partnerUserAccounts.email, PARTNER_EMAIL))
    .limit(1);

  if (!account) {
    console.error(`No partner account for ${PARTNER_EMAIL}. Run db:seed-all-partner-types first.`);
    process.exit(1);
  }

  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.partnerId, account.partnerId))
    .limit(1);

  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.partnerId, account.partnerId))
    .limit(1);

  if (!supplier) {
    console.error('Supplier record missing for Onboard Test Supplier.');
    process.exit(1);
  }

  const supplierId = supplier.supplierId;

  // Remove prior demo SKUs so re-run is idempotent
  await db
    .delete(supplierProducts)
    .where(
      and(
        eq(supplierProducts.supplierId, supplierId),
        or(
          like(supplierProducts.productCode, 'DEMO-SKU-%'),
          like(supplierProducts.productCode, 'OTS-SKU-%')
        )
      )
    );

  for (const p of CATALOG_PRODUCTS) {
    await db.insert(supplierProducts).values({
      supplierId,
      productCode: p.code,
      productName: p.name,
      productCategory: p.category,
      unitPrice: p.price,
      currency: 'USD',
      unitOfMeasure: 'each',
      minimumOrderQuantity: '1',
      status: 'pending_approval',
      isActive: true,
    });
  }

  const stageData: Record<string, Record<string, unknown>> = {};
  for (const stage of SUPPLIER_ONBOARDING_STAGE_ORDER) {
    stageData[stage] = { status: 'pending' };
  }
  stageData.supplier_registration = { status: 'completed', acceptedTerms: true };
  stageData.catalog_setup = { status: 'in_progress' };

  await db
    .update(supplierOnboardingWorkflows)
    .set({
      currentStage: 'catalog_setup',
      stageStatus: 'in_progress',
      completedStages: ['supplier_registration'],
      stageData,
      blockedReasons: null,
      updatedAt: new Date(),
    })
    .where(eq(supplierOnboardingWorkflows.supplierId, supplierId));

  console.log(`✅ ${partner?.partnerName ?? 'Onboard Test Supplier'}`);
  console.log(`   Partner: ${account.partnerId}`);
  console.log(`   Supplier: ${supplierId}`);
  console.log(`   Stage: catalog_setup (registration completed)`);
  console.log(`   Products: ${CATALOG_PRODUCTS.length} (pending_approval)`);
  console.log(`   Login: ${PARTNER_EMAIL} / OnboardTest2026!`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
