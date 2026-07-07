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
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '../src/db';
import { partners } from '../src/db/schema/partners';
import { partnerUserAccounts } from '../src/db/schema/partnerAuth';

const REDACTED_NAME = 'Redacted Partner';

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
    await db
      .update(partners)
      .set({
        partnerName: `${REDACTED_NAME} ${partner.partnerCode}`,
        displayName: null,
        website: null,
        description: null,
        logoUrl: null,
        metadata: {},
        piiPurgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(partners.partnerId, partner.partnerId));

    const accounts = await db
      .select({ accountId: partnerUserAccounts.accountId })
      .from(partnerUserAccounts)
      .where(eq(partnerUserAccounts.partnerId, partner.partnerId));

    for (const account of accounts) {
      // Email has a unique constraint — key the redacted address off the account, not the partner.
      await db
        .update(partnerUserAccounts)
        .set({
          firstName: 'Redacted',
          lastName: 'Redacted',
          email: `redacted+${account.accountId}@purged.invalid`,
          phone: null,
        })
        .where(eq(partnerUserAccounts.accountId, account.accountId));
    }

    console.log(`  Purged PII for partner ${partner.partnerId} (${partner.partnerCode}).`);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Retention purge failed:', error);
  process.exit(1);
});
