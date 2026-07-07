import 'dotenv/config';
import { db } from '../src/db';
import { partnerUserAccounts } from '../src/db/schema/partnerAuth';
import { eq } from 'drizzle-orm';
import { onboardingService } from '../src/services/onboardingService';

async function main() {
  const [acc] = await db
    .select()
    .from(partnerUserAccounts)
    .where(eq(partnerUserAccounts.email, 'onboard.agency@example.com'))
    .limit(1);
  if (!acc) {
    console.error('No agency account found');
    process.exit(1);
  }
  const agreement = await onboardingService.ensureServicePartnerAgreementIfNeeded(acc.partnerId);
  if (!agreement) {
    console.error('Could not issue agreement — partner must be on agreement stage or past verification');
    process.exit(1);
  }
  console.log(`✅ ${agreement.title} (${agreement.status}) — ${agreement.agreementNumber}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
