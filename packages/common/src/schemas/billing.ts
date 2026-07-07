import { z } from 'zod';

export const createBillingPlanSchema = z.object({
  planName: z.string().min(1).max(255),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const updateBillingPlanSchema = createBillingPlanSchema.partial();

export const assignBillingPlanSchema = z.object({
  partnerId: z.string().uuid(),
  planId: z.string().uuid(),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
});

export const markBillingInvoicePaidSchema = z.object({
  paidReference: z.string().max(255).optional(),
});

export type CreateBillingPlanInput = z.infer<typeof createBillingPlanSchema>;
export type AssignBillingPlanInput = z.infer<typeof assignBillingPlanSchema>;
