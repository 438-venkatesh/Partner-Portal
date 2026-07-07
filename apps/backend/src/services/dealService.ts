import { and, eq, gt, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { deals, partners } from '../db/schema';
import { logPartnerActivity } from '../utils/activityLogger';
import { notificationService } from './notificationService';
import { commissionService } from './commissionService';
import { incentiveService } from './incentiveService';
import type { RegisterDealInput } from '@partner-portal/common';

/** How long an approved deal is protected from being claimed by another partner. */
const PROTECTION_WINDOW_DAYS = 90;

export const dealService = {
  /** Active deals (unresolved, or still inside their protection window) for the same customer. */
  async findConflicts(customerName: string, tenantId: string | undefined, excludePartnerId: string) {
    const rows = await db
      .select()
      .from(deals)
      .where(
        and(
          tenantId ? eq(deals.tenantId, tenantId) : sql`lower(${deals.customerName}) = lower(${customerName})`,
          sql`${deals.partnerId} != ${excludePartnerId}`,
          or(
            eq(deals.status, 'pending_review'),
            and(eq(deals.status, 'approved'), gt(deals.protectionExpiresAt, new Date()))
          )
        )
      );
    return rows;
  },

  async registerDeal(
    partnerId: string,
    input: RegisterDealInput,
    submittedBy?: string,
    registeredOnBehalfBy?: string
  ) {
    const conflicts = await this.findConflicts(input.customerName, input.tenantId, partnerId);

    const [deal] = await db
      .insert(deals)
      .values({
        partnerId,
        tenantId: input.tenantId,
        customerName: input.customerName,
        dealName: input.dealName,
        estimatedValue: input.estimatedValue?.toString(),
        currency: input.currency ?? 'USD',
        expectedCloseDate: input.expectedCloseDate,
        notes: conflicts.length > 0
          ? `${input.notes ?? ''}\n[System] ${conflicts.length} conflicting registration(s) detected at submission.`.trim()
          : input.notes,
        submittedBy,
        registeredOnBehalfBy,
      })
      .returning();

    await logPartnerActivity({
      partnerId,
      activityType: 'other',
      activityDescription: `Deal registered: ${input.dealName} (${input.customerName})`,
      performedBy: registeredOnBehalfBy ?? submittedBy ?? '00000000-0000-0000-0000-000000000000',
      performedByType: registeredOnBehalfBy ? 'platform_admin' : 'partner_user',
      metadata: { dealId: deal.dealId, conflictCount: conflicts.length },
    });

    return { deal, conflicts };
  },

  async listForPartner(partnerId: string) {
    return db.select().from(deals).where(eq(deals.partnerId, partnerId)).orderBy(sql`created_at desc`);
  },

  async listAll(filters?: { status?: string }) {
    const rows = await db
      .select({
        dealId: deals.dealId,
        partnerId: deals.partnerId,
        partnerName: partners.partnerName,
        tenantId: deals.tenantId,
        customerName: deals.customerName,
        dealName: deals.dealName,
        estimatedValue: deals.estimatedValue,
        currency: deals.currency,
        status: deals.status,
        protectionExpiresAt: deals.protectionExpiresAt,
        createdAt: deals.createdAt,
      })
      .from(deals)
      .leftJoin(partners, eq(deals.partnerId, partners.partnerId))
      .orderBy(sql`${deals.createdAt} desc`);
    return filters?.status ? rows.filter((r) => r.status === filters.status) : rows;
  },

  async getById(dealId: string) {
    const [row] = await db.select().from(deals).where(eq(deals.dealId, dealId)).limit(1);
    return row ?? null;
  },

  async review(dealId: string, approved: boolean, rejectionReason: string | undefined, actorId: string) {
    const deal = await this.getById(dealId);
    if (!deal) throw new Error('Deal not found');

    const [updated] = await db
      .update(deals)
      .set({
        status: approved ? 'approved' : 'rejected',
        protectionExpiresAt: approved
          ? new Date(Date.now() + PROTECTION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
          : null,
        rejectionReason: approved ? null : rejectionReason,
        reviewedBy: actorId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deals.dealId, dealId))
      .returning();

    await notificationService.createForAllPartnerUsers(deal.partnerId, {
      type: 'deal_reviewed',
      title: approved ? `Deal approved: ${deal.dealName}` : `Deal rejected: ${deal.dealName}`,
      body: approved
        ? `Protected for ${PROTECTION_WINDOW_DAYS} days from today.`
        : rejectionReason ?? 'No reason given.',
    });

    return updated;
  },

  /** Marks a deal won or lost. Winning triggers commission calculation and challenge re-evaluation. */
  async resolve(dealId: string, outcome: 'won' | 'lost', actualValue: number | undefined, actorId: string) {
    const deal = await this.getById(dealId);
    if (!deal) throw new Error('Deal not found');
    if (deal.status !== 'approved') {
      throw new Error('Only an approved deal can be marked won or lost');
    }

    const [updated] = await db
      .update(deals)
      .set({
        status: outcome,
        actualValue: actualValue !== undefined ? actualValue.toString() : deal.estimatedValue,
        resolvedAt: new Date(),
        reviewedBy: actorId,
        updatedAt: new Date(),
      })
      .where(eq(deals.dealId, dealId))
      .returning();

    if (outcome === 'won') {
      await commissionService.recordDealCommission(updated);
      await incentiveService.evaluateAndAward(updated.partnerId);
    }

    await notificationService.createForAllPartnerUsers(deal.partnerId, {
      type: 'deal_resolved',
      title: `Deal ${outcome}: ${deal.dealName}`,
      body: outcome === 'won' ? 'Congratulations — commission is being calculated.' : 'Better luck next time.',
    });

    return updated;
  },

  /** Cron-invocable: flips approved-but-unresolved deals to expired once their protection window lapses. */
  async expireStaleProtections() {
    const rows = await db
      .update(deals)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(
        and(
          eq(deals.status, 'approved'),
          sql`${deals.protectionExpiresAt} IS NOT NULL AND ${deals.protectionExpiresAt} < now()`
        )
      )
      .returning({ dealId: deals.dealId });
    return rows.length;
  },
};
