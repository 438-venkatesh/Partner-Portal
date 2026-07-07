/**
 * Nudges partners about agreements nearing their end date, and flips any agreement that's
 * already past its end date to 'expired'. Intended to run on a daily schedule (cron/host
 * scheduler) since this backend has no job queue of its own yet.
 * Run: pnpm --filter @partner-portal/backend exec tsx scripts/send-agreement-reminders.ts
 */
import 'dotenv/config';
import { agreementReminderService } from '../src/services/agreementReminderService';

async function main() {
  const reminders = await agreementReminderService.sendExpiryReminders();
  console.log(`Checked ${reminders.checked} expiring agreement(s), sent ${reminders.sent} reminder(s).`);
  for (const r of reminders.results) {
    console.log(`  ${r.agreementId}: ${r.sent ? 'sent' : `skipped (${r.reason})`}`);
  }

  const expired = await agreementReminderService.expireOverdueAgreements();
  console.log(`Checked ${expired.checked} signed agreement(s), expired ${expired.expired}.`);

  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to send agreement reminders:', error);
  process.exit(1);
});
