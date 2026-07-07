/**
 * Sets onboard.supplier@example.com to supplier_documentation with 5 required doc rows.
 * Run: pnpm --filter @partner-portal/backend run db:seed-onboard-supplier-documentation
 */
import 'dotenv/config';
import { db } from '../src/db';
import { partners } from '../src/db/schema/partners';
import { partnerUserAccounts } from '../src/db/schema/partnerAuth';
import { suppliers } from '../src/db/schema/suppliers';
import { partnerDocuments } from '../src/db/schema/documents';
import { supplierOnboardingWorkflows } from '../src/db/schema/advanced';
import { eq } from 'drizzle-orm';
import { SUPPLIER_ONBOARDING_STAGE_ORDER, SUPPLIER_REQUIRED_DOCUMENT_TYPES } from '@partner-portal/common';

const PARTNER_EMAIL = 'onboard.supplier@example.com';

/** Public sample PDF for demo preview (seed rows do not use Cloudinary). */
const DEMO_PDF_URL = 'https://pdfobject.com/pdf/sample.pdf';

const DOC_SEEDS: { type: (typeof SUPPLIER_REQUIRED_DOCUMENT_TYPES)[number]; name: string }[] = [
  { type: 'business_license', name: 'Demo Business License.pdf' },
  { type: 'tax_certificate', name: 'Demo Tax Certificate.pdf' },
  { type: 'quality_certification', name: 'Demo ISO 9001.pdf' },
  { type: 'insurance_certificate', name: 'Demo Insurance Certificate.pdf' },
  { type: 'compliance_document', name: 'Demo Compliance Pack.pdf' },
];

async function main() {
  const [account] = await db
    .select({ partnerId: partnerUserAccounts.partnerId, accountId: partnerUserAccounts.accountId })
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
    console.error('Supplier record missing.');
    process.exit(1);
  }

  const partnerId = account.partnerId;
  const supplierId = supplier.supplierId;

  const existing = await db
    .select({ documentType: partnerDocuments.documentType })
    .from(partnerDocuments)
    .where(eq(partnerDocuments.partnerId, partnerId));
  const existingTypes = new Set(existing.map((d) => d.documentType));

  for (const doc of DOC_SEEDS) {
    if (existingTypes.has(doc.type)) {
      continue;
    }
    await db.insert(partnerDocuments).values({
      partnerId,
      documentType: doc.type,
      documentName: doc.name,
      fileUrl: DEMO_PDF_URL,
      storageKey: null,
      fileSize: 1024,
      mimeType: 'application/pdf',
      status: 'pending',
      uploadedBy: account.accountId,
      uploadedAt: new Date(),
      notes: 'Seeded for admin documentation review demo',
    });
  }

  const stageData: Record<string, Record<string, unknown>> = {};
  for (const stage of SUPPLIER_ONBOARDING_STAGE_ORDER) {
    stageData[stage] = { status: 'pending' };
  }
  stageData.supplier_registration = { status: 'completed' };
  stageData.catalog_setup = { status: 'completed' };
  stageData.supplier_documentation = {
    status: 'in_progress',
    submittedForReview: true,
    submittedAt: new Date().toISOString(),
  };

  await db
    .update(supplierOnboardingWorkflows)
    .set({
      currentStage: 'supplier_documentation',
      stageStatus: 'in_progress',
      completedStages: ['supplier_registration', 'catalog_setup'],
      stageData,
      blockedReasons: null,
      updatedAt: new Date(),
    })
    .where(eq(supplierOnboardingWorkflows.supplierId, supplierId));

  console.log(`✅ ${partner?.partnerName ?? 'Onboard Test Supplier'}`);
  console.log(`   Partner: ${partnerId}`);
  console.log(`   Supplier: ${supplierId}`);
  console.log(`   Stage: supplier_documentation (submitted for review)`);
  console.log(`   Documents: ${DOC_SEEDS.length} required types`);
  console.log(`   Login: ${PARTNER_EMAIL} / OnboardTest2026!`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
