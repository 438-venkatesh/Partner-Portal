import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { partnerWebhooks } from '../db/schema';

export const webhookService = {
  async createWebhook(partnerId: string, url: string, events: string[]) {
    const secret = crypto.randomBytes(32).toString('hex');
    const [row] = await db
      .insert(partnerWebhooks)
      .values({
        partnerId,
        url,
        events,
        secret,
      })
      .returning();
    return { row, secret };
  },

  async listWebhooks(partnerId: string) {
    return db
      .select({
        webhookId: partnerWebhooks.webhookId,
        url: partnerWebhooks.url,
        events: partnerWebhooks.events,
        isActive: partnerWebhooks.isActive,
        createdAt: partnerWebhooks.createdAt,
      })
      .from(partnerWebhooks)
      .where(eq(partnerWebhooks.partnerId, partnerId));
  },

  async deleteWebhook(partnerId: string, webhookId: string) {
    await db
      .delete(partnerWebhooks)
      .where(and(eq(partnerWebhooks.webhookId, webhookId), eq(partnerWebhooks.partnerId, partnerId)));
  },
};
