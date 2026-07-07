/**
 * Flips approved-but-unresolved deals to 'expired' once their protection window has lapsed, so
 * another partner can register the same customer again. Cron-invocable, matching this backend's
 * other no-queue scheduled scripts.
 * Run: pnpm --filter @partner-portal/backend exec tsx scripts/expire-deal-protections.ts
 */
import 'dotenv/config';
import { dealService } from '../src/services/dealService';

async function main() {
  const count = await dealService.expireStaleProtections();
  console.log(`Expired ${count} deal registration(s) past their protection window.`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to expire deal protections:', error);
  process.exit(1);
});
