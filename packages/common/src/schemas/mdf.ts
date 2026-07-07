import { z } from 'zod';

export const createMdfFundSchema = z.object({
  name: z.string().min(1).max(200),
  totalBudget: z.number().min(0),
  fiscalPeriod: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

export const updateMdfFundSchema = createMdfFundSchema.partial();

export const createMdfRequestSchema = z.object({
  fundId: z.string().uuid(),
  dealId: z.string().uuid().optional(),
  campaignName: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  requestedAmount: z.number().min(0),
  proofOfExpenseUrl: z.string().url().optional(),
});

export const reviewMdfRequestSchema = z.object({
  approved: z.boolean(),
  approvedAmount: z.number().min(0).optional(),
  rejectionReason: z.string().max(1000).optional(),
});

export type CreateMdfFundInput = z.infer<typeof createMdfFundSchema>;
export type CreateMdfRequestInput = z.infer<typeof createMdfRequestSchema>;
