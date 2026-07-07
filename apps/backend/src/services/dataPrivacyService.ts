import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { partners, partnerUserAccounts, dataErasureRequests } from '../db/schema';
import { agreementService } from './agreementService';
import { dealService } from './dealService';
import { leadService } from './leadService';
import { commissionService } from './commissionService';
import { mdfService } from './mdfService';
import { rewardsService } from './rewardsService';
import { documentService } from './documentService';
import type { CreateErasureRequestInput } from '@partner-portal/common';

const REDACTED_NAME = 'Redacted Partner';

/**
 * Anonymizes a partner's own PII and their users' PII, in place. Financial and audit records
 * (invoices, activity logs, commission records) are intentionally left intact. Idempotent — a
 * partner already purged (piiPurgedAt set) is a no-op. Shared by the scheduled retention-purge
 * script and the GDPR erasure-request approval flow below, so both anonymize identically.
 */
export async function anonymizePartnerPii(partnerId: string): Promise<void> {
  const [partner] = await db.select().from(partners).where(eq(partners.partnerId, partnerId)).limit(1);
  if (!partner || partner.piiPurgedAt) return;

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
    .where(eq(partners.partnerId, partnerId));

  const accounts = await db
    .select({ accountId: partnerUserAccounts.accountId })
    .from(partnerUserAccounts)
    .where(eq(partnerUserAccounts.partnerId, partnerId));

  for (const account of accounts) {
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
}

export const dataPrivacyService = {
  anonymizePartnerPii,

  /** GDPR Art. 15/20-style data-portability export — everything the partner's own account touches. */
  async exportPartnerData(partnerId: string) {
    const [partner] = await db.select().from(partners).where(eq(partners.partnerId, partnerId)).limit(1);
    if (!partner) throw new Error('Partner not found');

    const [documents, agreements, deals, leads, commissions, mdfRequests, rewardBalance, rewardHistory] =
      await Promise.all([
        documentService.getPartnerDocuments(partnerId),
        agreementService.listForPartner(partnerId),
        dealService.listForPartner(partnerId),
        leadService.listForPartner(partnerId),
        commissionService.listForPartner(partnerId),
        mdfService.listForPartner(partnerId),
        rewardsService.getBalance(partnerId),
        rewardsService.listTransactions(partnerId, 500),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        partnerId: partner.partnerId,
        partnerCode: partner.partnerCode,
        partnerName: partner.partnerName,
        displayName: partner.displayName,
        partnerType: partner.partnerType,
        tier: partner.tier,
        status: partner.status,
        website: partner.website,
        description: partner.description,
        createdAt: partner.createdAt,
      },
      documents,
      agreements,
      deals,
      leads,
      commissions,
      mdfRequests,
      rewards: { balance: rewardBalance, history: rewardHistory },
    };
  },

  async createErasureRequest(partnerId: string, requestedBy: string, input: CreateErasureRequestInput) {
    const [request] = await db
      .insert(dataErasureRequests)
      .values({ partnerId, requestedBy, reason: input.reason })
      .returning();
    return request;
  },

  async listErasureRequestsForPartner(partnerId: string) {
    return db
      .select()
      .from(dataErasureRequests)
      .where(eq(dataErasureRequests.partnerId, partnerId))
      .orderBy(desc(dataErasureRequests.createdAt));
  },

  async listAllErasureRequests(status?: string) {
    const rows = await db
      .select({ request: dataErasureRequests, partnerName: partners.partnerName })
      .from(dataErasureRequests)
      .leftJoin(partners, eq(dataErasureRequests.partnerId, partners.partnerId))
      .orderBy(desc(dataErasureRequests.createdAt));
    return status ? rows.filter((r) => r.request.status === status) : rows;
  },

  async reviewErasureRequest(
    requestId: string,
    approved: boolean,
    reviewerId: string,
    rejectionReason?: string
  ) {
    const [existing] = await db
      .select()
      .from(dataErasureRequests)
      .where(and(eq(dataErasureRequests.requestId, requestId), eq(dataErasureRequests.status, 'pending')))
      .limit(1);
    if (!existing) throw new Error('Pending erasure request not found');

    const [request] = await db
      .update(dataErasureRequests)
      .set({
        status: approved ? 'approved' : 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: approved ? null : rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(dataErasureRequests.requestId, requestId))
      .returning();

    if (approved) {
      await anonymizePartnerPii(existing.partnerId);
    }

    return request;
  },
};
