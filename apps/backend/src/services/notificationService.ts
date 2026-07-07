import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { notifications, partnerUserAccounts } from '../db/schema';

export const notificationService = {
  async createForUser(input: {
    userId: string;
    partnerId: string;
    type: string;
    title: string;
    body?: string;
    metadata?: Record<string, unknown>;
  }) {
    const [row] = await db
      .insert(notifications)
      .values({
        userId: input.userId,
        partnerId: input.partnerId,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: input.metadata ?? {},
      })
      .returning();
    return row;
  },

  /** Notify all active users for a partner (e.g. org-wide broadcast). */
  async createForAllPartnerUsers(
    partnerId: string,
    input: { type: string; title: string; body?: string; metadata?: Record<string, unknown> }
  ) {
    const users = await db
      .select({ accountId: partnerUserAccounts.accountId })
      .from(partnerUserAccounts)
      .where(
        and(
          eq(partnerUserAccounts.partnerId, partnerId),
          eq(partnerUserAccounts.status, 'active')
        )
      );
    for (const u of users) {
      await this.createForUser({
        userId: u.accountId,
        partnerId,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: input.metadata,
      });
    }
  },

  async listForUser(partnerId: string, userId: string, opts?: { limit?: number }) {
    const limit = Math.min(opts?.limit ?? 50, 100);
    return db
      .select()
      .from(notifications)
      .where(and(eq(notifications.partnerId, partnerId), eq(notifications.userId, userId)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  },

  async unreadCount(partnerId: string, userId: string) {
    const [row] = await db
      .select({ c: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.partnerId, partnerId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return Number(row?.c ?? 0);
  },

  async markRead(notificationId: string, partnerId: string, userId: string) {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.notificationId, notificationId),
          eq(notifications.partnerId, partnerId),
          eq(notifications.userId, userId)
        )
      )
      .returning();
    return updated ?? null;
  },
};
