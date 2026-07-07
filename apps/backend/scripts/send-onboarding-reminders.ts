/**
 * Nudges partners who have gone quiet mid-onboarding. Intended to run on a daily schedule
 * (cron/host scheduler) since this backend has no job queue of its own yet.
 * Run: pnpm --filter @partner-portal/backend exec tsx scripts/send-onboarding-reminders.ts
 */
import 'dotenv/config';
import { onboardingReminderService } from '../src/services/onboardingReminderService';

async function main() {
  const result = await onboardingReminderService.runOnce();
  console.log(`Checked ${result.checked} stalled partner(s), sent ${result.sent} reminder(s).`);
  for (const r of result.results) {
    console.log(`  ${r.partnerId}: ${r.sent ? 'sent' : `skipped (${r.reason})`}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to send onboarding reminders:', error);
  process.exit(1);
});
