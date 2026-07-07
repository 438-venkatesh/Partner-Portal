import { and, count, eq } from 'drizzle-orm';
import { db } from '../db';
import { partners, partnerTierDefinitions, partnerDocuments } from '../db/schema';
import { logPartnerActivity } from '../utils/activityLogger';
import { notificationService } from './notificationService';
import { rewardsService } from './rewardsService';
import type { TierDefinitionInput } from '@partner-portal/common';

function daysBetween(from: Date | null, to: Date): number {
  if (!from) return 0;
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export const tierService = {
  async listDefinitions() {
    const rows = await db.select().from(partnerTierDefinitions);
    return rows.sort((a, b) => a.rank - b.rank);
  },

  async createDefinition(input: TierDefinitionInput) {
    const [row] = await db
      .insert(partnerTierDefinitions)
      .values({
        tierCode: input.tierCode,
        label: input.label,
        description: input.description,
        rank: input.rank,
        badgeColor: input.badgeColor,
        benefits: input.benefits ?? [],
        minTenureDays: input.minTenureDays,
        minVerifiedDocuments: input.minVerifiedDocuments,
        minRewardPoints: input.minRewardPoints,
        isActive: input.isActive ?? true,
      })
      .returning();
    return row;
  },

  async updateDefinition(tierCode: string, patch: Partial<TierDefinitionInput>) {
    const [row] = await db
      .update(partnerTierDefinitions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(partnerTierDefinitions.tierCode, tierCode))
      .returning();
    return row ?? null;
  },

  async deleteDefinition(tierCode: string) {
    await db.delete(partnerTierDefinitions).where(eq(partnerTierDefinitions.tierCode, tierCode));
  },

  /** Everything needed to render "you're on Silver, here's what Gold requires." */
  async getTierProgress(partnerId: string) {
    const [partner] = await db
      .select({ tier: partners.tier, approvalDate: partners.approvalDate })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);
    if (!partner) throw new Error('Partner not found');

    const definitions = (await this.listDefinitions()).filter((d) => d.isActive);
    const currentDef = definitions.find((d) => d.tierCode === partner.tier) ?? null;

    const [{ verifiedDocs }] = await db
      .select({ verifiedDocs: count() })
      .from(partnerDocuments)
      .where(and(eq(partnerDocuments.partnerId, partnerId), eq(partnerDocuments.status, 'approved')));

    const tenureDays = daysBetween(partner.approvalDate, new Date());
    const rewardBalance = await rewardsService.getBalance(partnerId);

    const eligible = definitions
      .filter((d) => {
        if (d.minTenureDays != null && tenureDays < d.minTenureDays) return false;
        if (d.minVerifiedDocuments != null && Number(verifiedDocs) < d.minVerifiedDocuments) return false;
        if (d.minRewardPoints != null && rewardBalance < d.minRewardPoints) return false;
        return true;
      })
      .sort((a, b) => b.rank - a.rank);

    const eligibleTier = eligible[0] ?? null;
    const currentRank = currentDef?.rank ?? -1;
    const nextTier = definitions
      .filter((d) => d.rank > currentRank)
      .sort((a, b) => a.rank - b.rank)[0] ?? null;

    return {
      currentTier: currentDef,
      eligibleTier,
      nextTier,
      canAutoPromote: !!eligibleTier && eligibleTier.rank > currentRank,
      signals: { tenureDays, verifiedDocuments: Number(verifiedDocs), rewardBalance },
    };
  },

  /**
   * Promotes to the highest eligible tier if it's better than the current one. Never auto-demotes.
   * Safe to call as a fire-and-forget side effect after any onboarding/document event — swallows
   * its own errors so a tier-evaluation hiccup never blocks the action that triggered it.
   */
  async evaluateAndPromote(partnerId: string) {
    try {
      return await this._evaluateAndPromote(partnerId);
    } catch {
      return null;
    }
  },

  async _evaluateAndPromote(partnerId: string) {
    const progress = await this.getTierProgress(partnerId);
    if (!progress.canAutoPromote || !progress.eligibleTier) return null;

    const [partner] = await db
      .update(partners)
      .set({ tier: progress.eligibleTier.tierCode, updatedAt: new Date() })
      .where(eq(partners.partnerId, partnerId))
      .returning();

    await logPartnerActivity({
      partnerId,
      activityType: 'tier_changed',
      activityDescription: `Auto-promoted to ${progress.eligibleTier.label}`,
      performedBy: '00000000-0000-0000-0000-000000000000',
      performedByType: 'platform_admin',
      metadata: { tierCode: progress.eligibleTier.tierCode, signals: progress.signals },
    });

    await notificationService.createForAllPartnerUsers(partnerId, {
      type: 'tier_upgraded',
      title: `You've been promoted to ${progress.eligibleTier.label}`,
      body: `Your partnership tier is now ${progress.eligibleTier.label}.`,
    });

    return partner;
  },

  /** Manual admin override — sets the tier regardless of whether criteria are met. */
  async setTierManually(partnerId: string, tierCode: string, actorId?: string) {
    const [partner] = await db
      .update(partners)
      .set({ tier: tierCode, updatedAt: new Date() })
      .where(eq(partners.partnerId, partnerId))
      .returning();
    if (!partner) throw new Error('Partner not found');

    await logPartnerActivity({
      partnerId,
      activityType: 'tier_changed',
      activityDescription: `Tier manually set to ${tierCode}`,
      performedBy: actorId ?? '00000000-0000-0000-0000-000000000000',
      performedByType: 'platform_admin',
      metadata: { tierCode },
    });

    return partner;
  },
};
