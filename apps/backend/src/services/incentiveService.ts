import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { incentiveChallenges, challengeCompletions, deals, partners } from '../db/schema';
import { commissionService } from './commissionService';
import { rewardsService } from './rewardsService';
import type { CreateIncentiveChallengeInput } from '@partner-portal/common';

export const incentiveService = {
  async listChallenges() {
    return db.select().from(incentiveChallenges).orderBy(desc(incentiveChallenges.createdAt));
  },

  async createChallenge(input: CreateIncentiveChallengeInput) {
    const [row] = await db
      .insert(incentiveChallenges)
      .values({
        name: input.name,
        description: input.description,
        metric: input.metric,
        target: input.target.toString(),
        rewardType: input.rewardType,
        rewardValue: input.rewardValue.toString(),
        partnerType: input.partnerType,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: input.isActive ?? true,
      })
      .returning();
    return row;
  },

  async updateChallenge(challengeId: string, patch: Partial<CreateIncentiveChallengeInput>) {
    const [row] = await db
      .update(incentiveChallenges)
      .set({
        ...patch,
        target: patch.target !== undefined ? patch.target.toString() : undefined,
        rewardValue: patch.rewardValue !== undefined ? patch.rewardValue.toString() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(incentiveChallenges.challengeId, challengeId))
      .returning();
    return row ?? null;
  },

  async deleteChallenge(challengeId: string) {
    await db.delete(incentiveChallenges).where(eq(incentiveChallenges.challengeId, challengeId));
  },

  async computeProgress(challenge: typeof incentiveChallenges.$inferSelect, partnerId: string): Promise<number> {
    const window = and(
      eq(deals.partnerId, partnerId),
      eq(deals.status, 'won'),
      gte(deals.resolvedAt, new Date(challenge.startDate)),
      lte(deals.resolvedAt, new Date(`${challenge.endDate}T23:59:59`))
    );
    if (challenge.metric === 'deals_won') {
      const [{ c }] = await db.select({ c: count() }).from(deals).where(window);
      return Number(c);
    }
    const [{ total }] = await db
      .select({ total: sql<number>`coalesce(sum(${deals.actualValue}), 0)`.as('total') })
      .from(deals)
      .where(window);
    return Number(total);
  },

  /** For the partner-facing "my challenges" view — every active challenge plus this partner's progress. */
  async listForPartner(partnerId: string) {
    const [partner] = await db
      .select({ partnerType: partners.partnerType })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);

    const today = new Date().toISOString().slice(0, 10);
    const challenges = (await this.listChallenges()).filter(
      (c) =>
        c.isActive &&
        c.startDate <= today &&
        c.endDate >= today &&
        (!c.partnerType || c.partnerType === partner?.partnerType)
    );

    const completions = await db
      .select({ challengeId: challengeCompletions.challengeId })
      .from(challengeCompletions)
      .where(eq(challengeCompletions.partnerId, partnerId));
    const completedIds = new Set(completions.map((c) => c.challengeId));

    return Promise.all(
      challenges.map(async (c) => ({
        ...c,
        progress: await this.computeProgress(c, partnerId),
        completed: completedIds.has(c.challengeId),
      }))
    );
  },

  /** Call after any deal is won — awards every challenge this partner just cleared, once each. */
  async evaluateAndAward(partnerId: string) {
    try {
      const withProgress = await this.listForPartner(partnerId);
      for (const challenge of withProgress) {
        if (challenge.completed || challenge.progress < Number(challenge.target)) continue;

        await db.insert(challengeCompletions).values({ challengeId: challenge.challengeId, partnerId });

        if (challenge.rewardType === 'points') {
          await rewardsService.addPoints(partnerId, Number(challenge.rewardValue), `Challenge completed: ${challenge.name}`);
        } else {
          await commissionService.recordSpiff(
            partnerId,
            Number(challenge.rewardValue),
            `Challenge completed: ${challenge.name}`,
            challenge.challengeId
          );
        }
      }
    } catch {
      // Non-fatal — never let incentive evaluation block the deal-resolution flow that triggered it.
    }
  },
};
