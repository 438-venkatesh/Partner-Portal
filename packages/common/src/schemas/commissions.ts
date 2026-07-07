import { z } from 'zod';

export const tieredRateSchema = z.object({
  minAmount: z.number().min(0),
  rate: z.number(),
});

export const createCommissionPlanSchema = z.object({
  name: z.string().min(1).max(200),
  partnerType: z.string().max(50).optional(),
  minTier: z.string().max(50).optional(),
  rateType: z.enum(['percentage', 'flat', 'tiered']),
  rate: z.number().optional(),
  tieredRates: z.array(tieredRateSchema).optional(),
  isActive: z.boolean().optional(),
});

export const updateCommissionPlanSchema = createCommissionPlanSchema.partial();

export const manualCommissionAdjustmentSchema = z.object({
  amount: z.number().refine((v) => v !== 0, 'Amount must not be zero'),
  description: z.string().min(1).max(500),
});

export const markCommissionsPaidSchema = z.object({
  recordIds: z.array(z.string().uuid()).min(1),
  reference: z.string().min(1).max(200),
});

export const createIncentiveChallengeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  metric: z.enum(['deals_won', 'revenue']),
  target: z.number().min(0),
  rewardType: z.enum(['points', 'fixed_amount']),
  rewardValue: z.number().min(0),
  partnerType: z.string().max(50).optional(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean().optional(),
});

export const updateIncentiveChallengeSchema = createIncentiveChallengeSchema.partial();

export type CreateCommissionPlanInput = z.infer<typeof createCommissionPlanSchema>;
export type CreateIncentiveChallengeInput = z.infer<typeof createIncentiveChallengeSchema>;
