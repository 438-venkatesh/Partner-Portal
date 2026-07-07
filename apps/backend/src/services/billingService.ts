import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { partnerBillingPlans, partnerSubscriptions } from '../db/schema';

export const billingService = {
  async listPlans() {
    return db.select().from(partnerBillingPlans).orderBy(desc(partnerBillingPlans.createdAt));
  },

  async getPartnerSubscription(partnerId: string) {
    const [row] = await db
      .select()
      .from(partnerSubscriptions)
      .where(eq(partnerSubscriptions.partnerId, partnerId))
      .orderBy(desc(partnerSubscriptions.createdAt))
      .limit(1);
    return row ?? null;
  },

  async assignPlan(partnerId: string, planId: string) {
    const [row] = await db
      .insert(partnerSubscriptions)
      .values({
        partnerId,
        planId,
        status: 'active',
        billingCycle: 'monthly',
      })
      .returning();
    return row;
  },
};
