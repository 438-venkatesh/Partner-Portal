import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { commissionPlans, commissionRecords, partners } from '../db/schema';
import { notificationService } from './notificationService';
import { logPartnerActivity } from '../utils/activityLogger';
import type { CreateCommissionPlanInput } from '@partner-portal/common';

const TIER_RANK: Record<string, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

type TieredRate = { minAmount: number; rate: number };

function tierMeetsMinimum(partnerTier: string | null, minTier: string | null | undefined): boolean {
  if (!minTier) return true;
  if (!partnerTier) return false;
  return (TIER_RANK[partnerTier.toLowerCase()] ?? -1) >= (TIER_RANK[minTier.toLowerCase()] ?? Infinity);
}

export const commissionService = {
  async listPlans() {
    return db.select().from(commissionPlans);
  },

  async createPlan(input: CreateCommissionPlanInput) {
    const [plan] = await db
      .insert(commissionPlans)
      .values({
        name: input.name,
        partnerType: input.partnerType,
        minTier: input.minTier,
        rateType: input.rateType,
        rate: input.rate?.toString(),
        tieredRates: input.tieredRates ?? [],
        isActive: input.isActive ?? true,
      })
      .returning();
    return plan;
  },

  async updatePlan(planId: string, patch: Partial<CreateCommissionPlanInput>) {
    const [plan] = await db
      .update(commissionPlans)
      .set({
        ...patch,
        rate: patch.rate !== undefined ? patch.rate.toString() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(commissionPlans.planId, planId))
      .returning();
    return plan ?? null;
  },

  async deletePlan(planId: string) {
    await db.delete(commissionPlans).where(eq(commissionPlans.planId, planId));
  },

  /** Most specific active plan wins: matching both type+tier beats matching just one. */
  async findMatchingPlan(partnerType: string, partnerTier: string | null) {
    const plans = await db.select().from(commissionPlans).where(eq(commissionPlans.isActive, true));
    const candidates = plans.filter(
      (p) => (!p.partnerType || p.partnerType === partnerType) && tierMeetsMinimum(partnerTier, p.minTier)
    );
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => {
      const specificity = (p: typeof a) => (p.partnerType ? 1 : 0) + (p.minTier ? 1 : 0);
      return specificity(b) - specificity(a);
    })[0];
  },

  calculateAmount(plan: { rateType: string; rate: string | null; tieredRates: unknown }, dealValue: number): number {
    if (plan.rateType === 'flat') {
      return Number(plan.rate ?? 0);
    }
    if (plan.rateType === 'tiered') {
      const tiers = (plan.tieredRates as TieredRate[]) ?? [];
      const applicable = tiers
        .filter((t) => dealValue >= t.minAmount)
        .sort((a, b) => b.minAmount - a.minAmount)[0];
      const rate = applicable?.rate ?? 0;
      return Math.round(dealValue * (rate / 100) * 100) / 100;
    }
    // percentage
    const rate = Number(plan.rate ?? 0);
    return Math.round(dealValue * (rate / 100) * 100) / 100;
  },

  /** Called when a deal is marked won — finds the applicable plan and records the commission owed. */
  async recordDealCommission(deal: { dealId: string; partnerId: string; actualValue: string | null; currency: string | null }) {
    const [partner] = await db
      .select({ partnerType: partners.partnerType, tier: partners.tier })
      .from(partners)
      .where(eq(partners.partnerId, deal.partnerId))
      .limit(1);
    if (!partner) return null;

    const plan = await this.findMatchingPlan(partner.partnerType, partner.tier);
    const dealValue = Number(deal.actualValue ?? 0);
    const amount = plan ? this.calculateAmount(plan, dealValue) : 0;
    if (amount <= 0) return null;

    const [record] = await db
      .insert(commissionRecords)
      .values({
        partnerId: deal.partnerId,
        dealId: deal.dealId,
        planId: plan?.planId,
        type: 'deal_commission',
        amount: amount.toString(),
        currency: deal.currency ?? 'USD',
        description: plan ? `Commission for won deal (plan: ${plan.name})` : 'Commission for won deal',
        status: 'pending',
      })
      .returning();

    await notificationService.createForAllPartnerUsers(deal.partnerId, {
      type: 'commission_earned',
      title: `You earned a commission: ${deal.currency ?? 'USD'} ${amount}`,
      body: 'Pending review before payout.',
    });

    return record;
  },

  async addManualAdjustment(partnerId: string, amount: number, description: string, actorId?: string) {
    const [record] = await db
      .insert(commissionRecords)
      .values({
        partnerId,
        type: 'manual_adjustment',
        amount: amount.toString(),
        description,
        status: 'approved',
        approvedBy: actorId,
        approvedAt: new Date(),
      })
      .returning();

    await logPartnerActivity({
      partnerId,
      activityType: 'other',
      activityDescription: `Manual commission adjustment: ${amount} — ${description}`,
      performedBy: actorId ?? '00000000-0000-0000-0000-000000000000',
      performedByType: 'platform_admin',
    });

    return record;
  },

  /** Also used internally by the incentive service to pay out a fixed-amount challenge reward. */
  async recordSpiff(partnerId: string, amount: number, description: string, challengeId?: string) {
    const [record] = await db
      .insert(commissionRecords)
      .values({
        partnerId,
        challengeId,
        type: 'spiff',
        amount: amount.toString(),
        description,
        status: 'approved',
        approvedAt: new Date(),
      })
      .returning();
    return record;
  },

  async listForPartner(partnerId: string) {
    return db
      .select()
      .from(commissionRecords)
      .where(eq(commissionRecords.partnerId, partnerId))
      .orderBy(desc(commissionRecords.createdAt));
  },

  async listAll(filters?: { status?: string }) {
    const rows = await db
      .select({
        recordId: commissionRecords.recordId,
        partnerId: commissionRecords.partnerId,
        partnerName: partners.partnerName,
        dealId: commissionRecords.dealId,
        type: commissionRecords.type,
        amount: commissionRecords.amount,
        currency: commissionRecords.currency,
        description: commissionRecords.description,
        status: commissionRecords.status,
        createdAt: commissionRecords.createdAt,
      })
      .from(commissionRecords)
      .leftJoin(partners, eq(commissionRecords.partnerId, partners.partnerId))
      .orderBy(desc(commissionRecords.createdAt));
    return filters?.status ? rows.filter((r) => r.status === filters.status) : rows;
  },

  async approve(recordId: string, actorId: string) {
    const [record] = await db
      .update(commissionRecords)
      .set({ status: 'approved', approvedBy: actorId, approvedAt: new Date() })
      .where(eq(commissionRecords.recordId, recordId))
      .returning();
    return record ?? null;
  },

  /** The manual "payout" step — this backend has no payment-gateway integration, so disbursement
   *  is recorded here (status + external reference) rather than faked as an automated wire transfer. */
  async markPaid(recordIds: string[], reference: string) {
    const rows = await db
      .update(commissionRecords)
      .set({ status: 'paid', paidAt: new Date(), paidReference: reference })
      .where(and(inArray(commissionRecords.recordId, recordIds), eq(commissionRecords.status, 'approved')))
      .returning();
    return rows;
  },

  async getPartnerBalance(partnerId: string) {
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${commissionRecords.amount}), 0)`.as('total') })
      .from(commissionRecords)
      .where(and(eq(commissionRecords.partnerId, partnerId), eq(commissionRecords.status, 'approved')));
    return Number(row?.total ?? 0);
  },
};
