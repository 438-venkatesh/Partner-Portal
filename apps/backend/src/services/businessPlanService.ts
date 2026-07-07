import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { partnerBusinessPlans } from '../db/schema';
import { notificationService } from './notificationService';
import type { CreateBusinessPlanInput, UpdateBusinessPlanInput } from '@partner-portal/common';

export const businessPlanService = {
  async listForPartner(partnerId: string) {
    return db
      .select()
      .from(partnerBusinessPlans)
      .where(eq(partnerBusinessPlans.partnerId, partnerId))
      .orderBy(desc(partnerBusinessPlans.createdAt));
  },

  async create(partnerId: string, input: CreateBusinessPlanInput, createdBy?: string) {
    const [row] = await db
      .insert(partnerBusinessPlans)
      .values({
        partnerId,
        title: input.title,
        description: input.description,
        targetMetric: input.targetMetric,
        targetValue: input.targetValue?.toString(),
        targetDate: input.targetDate,
        createdBy: createdBy ?? null,
      })
      .returning();

    await notificationService.createForAllPartnerUsers(partnerId, {
      type: 'business_plan',
      title: `New goal: ${input.title}`,
      body: 'Your account team set a new shared goal — check your progress anytime.',
    });

    return row;
  },

  async update(planId: string, partnerId: string, patch: UpdateBusinessPlanInput) {
    const [row] = await db
      .update(partnerBusinessPlans)
      .set({
        ...patch,
        targetValue: patch.targetValue !== undefined ? patch.targetValue.toString() : undefined,
        currentValue: patch.currentValue !== undefined ? patch.currentValue.toString() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(partnerBusinessPlans.planId, planId))
      .returning();
    if (!row || row.partnerId !== partnerId) return null;
    return row;
  },

  async delete(planId: string, partnerId: string) {
    const [existing] = await db
      .select({ partnerId: partnerBusinessPlans.partnerId })
      .from(partnerBusinessPlans)
      .where(eq(partnerBusinessPlans.planId, planId))
      .limit(1);
    if (!existing || existing.partnerId !== partnerId) return false;
    await db.delete(partnerBusinessPlans).where(eq(partnerBusinessPlans.planId, planId));
    return true;
  },
};
