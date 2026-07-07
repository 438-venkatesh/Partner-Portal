import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { partnerRewardTransactions } from '../db/schema';
import { notificationService } from './notificationService';
import { logPartnerActivity } from '../utils/activityLogger';

export const rewardsService = {
  /** Balance is always derived from the ledger — never stored, so it can't drift. */
  async getBalance(partnerId: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${partnerRewardTransactions.points}), 0)`.as('total') })
      .from(partnerRewardTransactions)
      .where(eq(partnerRewardTransactions.partnerId, partnerId));
    return Number(row?.total ?? 0);
  },

  async listTransactions(partnerId: string, limit = 50) {
    return db
      .select()
      .from(partnerRewardTransactions)
      .where(eq(partnerRewardTransactions.partnerId, partnerId))
      .orderBy(desc(partnerRewardTransactions.createdAt))
      .limit(limit);
  },

  /** Award (positive) or redeem (negative) points; notifies the partner either way. */
  async addPoints(partnerId: string, points: number, reason: string, actorId?: string) {
    const [row] = await db
      .insert(partnerRewardTransactions)
      .values({ partnerId, points, reason, createdBy: actorId ?? null })
      .returning();

    await logPartnerActivity({
      partnerId,
      activityType: 'other',
      activityDescription: `${points > 0 ? 'Awarded' : 'Deducted'} ${Math.abs(points)} reward point(s): ${reason}`,
      performedBy: actorId ?? '00000000-0000-0000-0000-000000000000',
      performedByType: 'platform_admin',
      metadata: { points, reason },
    });

    await notificationService.createForAllPartnerUsers(partnerId, {
      type: 'reward_points',
      title: points > 0 ? `You earned ${points} reward points` : `${Math.abs(points)} reward points deducted`,
      body: reason,
    });

    return row;
  },
};
