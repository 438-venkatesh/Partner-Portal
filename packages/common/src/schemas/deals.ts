import { z } from 'zod';

export const dealStatusSchema = z.enum(['pending_review', 'approved', 'rejected', 'won', 'lost', 'expired']);

export const registerDealSchema = z.object({
  tenantId: z.string().uuid().optional(),
  customerName: z.string().min(1).max(255),
  dealName: z.string().min(1).max(255),
  estimatedValue: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const reviewDealSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().max(1000).optional(),
});

export const resolveDealSchema = z.object({
  outcome: z.enum(['won', 'lost']),
  actualValue: z.number().min(0).optional(),
});

export type RegisterDealInput = z.infer<typeof registerDealSchema>;
export type ReviewDealInput = z.infer<typeof reviewDealSchema>;
export type ResolveDealInput = z.infer<typeof resolveDealSchema>;
