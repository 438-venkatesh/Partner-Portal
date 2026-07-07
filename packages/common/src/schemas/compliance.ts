import { z } from 'zod';

export const signAgreementSchema = z.object({
  fullName: z.string().min(2).max(255),
});

export const createErasureRequestSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export const reviewErasureRequestSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().max(2000).optional(),
});

export type SignAgreementInput = z.infer<typeof signAgreementSchema>;
export type CreateErasureRequestInput = z.infer<typeof createErasureRequestSchema>;
export type ReviewErasureRequestInput = z.infer<typeof reviewErasureRequestSchema>;
