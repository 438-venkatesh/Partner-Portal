import { z } from 'zod';

export const tierDefinitionInputSchema = z.object({
  tierCode: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/, 'Lowercase letters, numbers, - and _ only'),
  label: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  rank: z.number().int().min(0).max(100),
  badgeColor: z.string().max(20).optional(),
  benefits: z.array(z.string().max(200)).optional(),
  minTenureDays: z.number().int().min(0).optional(),
  minVerifiedDocuments: z.number().int().min(0).optional(),
  minRewardPoints: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateTierDefinitionSchema = tierDefinitionInputSchema.omit({ tierCode: true }).partial();

export const segmentCriteriaSchema = z.object({
  search: z.string().max(255).optional(),
  partnerTypes: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  tiers: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const createSegmentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  criteria: segmentCriteriaSchema,
});

export const updateSegmentSchema = createSegmentSchema.partial();

export const createBusinessPlanSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  targetMetric: z.string().max(100).optional(),
  targetValue: z.number().optional(),
  targetDate: z.string().optional(),
});

export const updateBusinessPlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  targetMetric: z.string().max(100).optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  targetDate: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'missed']).optional(),
});

export const awardRewardPointsSchema = z.object({
  points: z.number().int().refine((v) => v !== 0, 'Points must not be zero'),
  reason: z.string().min(1).max(500),
});

export const assignAccountManagerSchema = z.object({
  accountManagerId: z.string().uuid().nullable(),
});

export const updatePartnerTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(50)).max(20),
});

export type TierDefinitionInput = z.infer<typeof tierDefinitionInputSchema>;
export type SegmentCriteria = z.infer<typeof segmentCriteriaSchema>;
export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;
export type CreateBusinessPlanInput = z.infer<typeof createBusinessPlanSchema>;
export type UpdateBusinessPlanInput = z.infer<typeof updateBusinessPlanSchema>;
