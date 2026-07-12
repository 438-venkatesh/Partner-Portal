/**
 * Flags (and, per active rule, suspends) partners with no partner-user login for longer than
 * the rule's inactivityDays. Intended to run on a daily schedule (cron/host scheduler).
 * Run: pnpm --filter @partner-portal/backend exec tsx scripts/run-auto-suspend-check.ts
 */
import 'dotenv/config';
import { autoSuspendService } from '../src/services/autoSuspendService';

async function main() {
  const result = await autoSuspendService.runInactivityCheck();
  console.log(`Flagged ${result.flagged.length} inactive partner(s), auto-suspended ${result.suspended.length}.`);
  for (const f of result.flagged) {
    console.log(`  ${f.partnerName} (${f.partnerId}): ${f.daysInactive} days inactive`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to run auto-suspend check:', error);
  process.exit(1);
});
