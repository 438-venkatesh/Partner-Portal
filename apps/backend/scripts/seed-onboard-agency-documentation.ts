/**
 * Seeds required documentation for onboard.agency@example.com at the documentation stage.
 * Run: pnpm --filter @partner-portal/backend run db:seed-onboard-agency-documentation
 */
import 'dotenv/config';
import { db } from '../src/db';
import { partners } from '../src/db/schema/partners';
import { partnerUserAccounts } from '../src/db/schema/partnerAuth';
import { partnerDocuments } from '../src/db/schema/documents';
import { partnerOnboardingWorkflows } from '../src/db/schema/advanced';
import { eq } from 'drizzle-orm';
import { PARTNER_ONBOARDING_STAGE_ORDER } from '../src/services/onboardingService';

const PARTNER_EMAIL = 'onboard.agency@example.com';

/** Public sample PDF for demo preview (seed rows do not use Cloudinary). */
const DEMO_PDF_URL = 'https://pdfobject.com/pdf/sample.pdf';

/** Service partner UI expects these five types via DocumentationStagePanel. */
const DOC_SEEDS: { type: string; name: string }[] = [
  { type: 'business_license', name: 'Demo Business License.pdf' },
  { type: 'tax_certificate', name: 'Demo Tax Certificate.pdf' },
  { type: 'quality_certification', name: 'Demo Quality Certification.pdf' },
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

  const partnerId = account.partnerId;

  const existing = await db
    .select({ documentType: partnerDocuments.documentType })
    .from(partnerDocuments)
    .where(eq(partnerDocuments.partnerId, partnerId));
  const existingTypes = new Set(existing.map((d) => d.documentType));

  let inserted = 0;
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
      notes: 'Seeded for agency documentation onboarding demo',
    });
    inserted += 1;
  }

  const completedStages = ['registration', 'service_selection', 'initial_review'];
  const stageData: Record<string, Record<string, unknown>> = {};
  for (const stage of PARTNER_ONBOARDING_STAGE_ORDER) {
    stageData[stage] = { status: 'pending' };
  }
  for (const stage of completedStages) {
    stageData[stage] = {
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
  }
  stageData.initial_review = {
    ...stageData.initial_review,
    notes: 'ok',
  };
  stageData.documentation = {
    status: 'in_progress',
  };

  await db
    .update(partnerOnboardingWorkflows)
    .set({
      currentStage: 'documentation',
      stageStatus: 'in_progress',
      completedStages,
      stageData,
      blockedReasons: null,
      updatedAt: new Date(),
    })
    .where(eq(partnerOnboardingWorkflows.partnerId, partnerId));

  console.log(`✅ ${partner?.partnerName ?? 'Onboard Test Agency'}`);
  console.log(`   Partner: ${partnerId}`);
  console.log(`   Stage: documentation (in progress)`);
  console.log(`   Documents inserted: ${inserted} (${DOC_SEEDS.length} types total)`);
  console.log(`   Login: ${PARTNER_EMAIL} / OnboardTest2026!`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
