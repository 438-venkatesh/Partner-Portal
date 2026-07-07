import { z } from 'zod';
import { partnerTypeSchema } from './partners';
import { partnerOnboardingStageSchema } from './partnerOnboarding';

export const stageSettingUpdateSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

export const stageSettingParamsSchema = z.object({
  partnerType: partnerTypeSchema,
  stageCode: partnerOnboardingStageSchema,
});

export const createAutoApprovalRuleSchema = z.object({
  name: z.string().min(1).max(200),
  partnerType: partnerTypeSchema.optional(),
  minTier: z.string().max(50).optional(),
  requireDocumentsVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateAutoApprovalRuleSchema = createAutoApprovalRuleSchema.partial();

export const partnerImportRowSchema = z.object({
  partnerName: z.string().min(1).max(255),
  displayName: z.string().max(255).optional(),
  partnerType: partnerTypeSchema,
  businessType: z.enum(['b2b', 'b2c', 'both']).optional(),
  tier: z.string().max(50).optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
});

export const directoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  search: z.string().optional(),
  partnerType: partnerTypeSchema.optional(),
  tier: z.string().optional(),
});

export type StageSettingUpdateInput = z.infer<typeof stageSettingUpdateSchema>;
export type CreateAutoApprovalRuleInput = z.infer<typeof createAutoApprovalRuleSchema>;
export type UpdateAutoApprovalRuleInput = z.infer<typeof updateAutoApprovalRuleSchema>;
export type PartnerImportRow = z.infer<typeof partnerImportRowSchema>;
export type DirectoryQuery = z.infer<typeof directoryQuerySchema>;
