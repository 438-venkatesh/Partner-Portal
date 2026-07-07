/**
 * Generates an invoice for every active partner subscription whose next billing date has
 * arrived, and advances that subscription to its following cycle. Intended to run on a daily
 * schedule (cron/host scheduler) since this backend has no job queue of its own yet.
 * Run: pnpm --filter @partner-portal/backend exec tsx scripts/run-billing-cycle.ts
 */
import 'dotenv/config';
import { billingService } from '../src/services/billingService';

async function main() {
  const result = await billingService.runBillingCycle();
  console.log(`Checked ${result.checked} subscription(s) due for billing, generated ${result.generated} invoice(s).`);
  for (const r of result.results) {
    console.log(`  ${r.subscriptionId}: ${r.invoiceId ? `invoice ${r.invoiceId}` : 'skipped'}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to run billing cycle:', error);
  process.exit(1);
});
