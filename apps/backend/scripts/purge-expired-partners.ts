/**
 * Anonymizes PII for offboarded partners once their retention window has elapsed. Financial
 * and audit records (invoices, activity logs) are intentionally left intact — only the partner's
 * own identifying fields, and their users' identifying fields, are redacted. Idempotent: a
 * partner already purged (piiPurgedAt set) is skipped on subsequent runs.
 *
 * Intended to run on a daily schedule (cron/host scheduler) — there is no job queue yet.
 * Run: pnpm --filter @partner-portal/backend exec tsx scripts/purge-expired-partners.ts
 */
import 'dotenv/config';
import { and, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '../src/db';
import { partners } from '../src/db/schema/partners';
import { anonymizePartnerPii } from '../src/services/dataPrivacyService';

async function main() {
  const candidates = await db
    .select()
    .from(partners)
    .where(
      and(
        isNotNull(partners.deletedAt),
        isNull(partners.piiPurgedAt),
        sql`${partners.deletedAt} + (COALESCE(${partners.dataRetentionDays}, 90) || ' days')::interval < now()`
      )
    );

  console.log(`Found ${candidates.length} partner(s) past their retention window.`);

  for (const partner of candidates) {
    await anonymizePartnerPii(partner.partnerId);
    console.log(`  Purged PII for partner ${partner.partnerId} (${partner.partnerCode}).`);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Retention purge failed:', error);
  process.exit(1);
});
