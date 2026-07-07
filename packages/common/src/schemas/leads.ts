import { z } from 'zod';

export const createLeadSchema = z.object({
  customerName: z.string().min(1).max(255),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  tenantId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

export const respondToLeadSchema = z.object({
  accepted: z.boolean(),
});

export const createLeadRoutingRuleSchema = z.object({
  name: z.string().min(1).max(200),
  partnerType: z.string().max(50).optional(),
  minTier: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const updateLeadRoutingRuleSchema = createLeadRoutingRuleSchema.partial();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type CreateLeadRoutingRuleInput = z.infer<typeof createLeadRoutingRuleSchema>;
