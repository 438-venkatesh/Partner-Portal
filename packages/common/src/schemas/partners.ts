import { z } from 'zod';

export const partnerTypeSchema = z.enum([
  'agency',
  'reseller',
  'integrator',
  'consultant',
  'affiliate',
  'supplier',
  'logistics_partner',
  'supplier_logistics',
]);

export const partnerStatusSchema = z.enum([
  'pending',
  'active',
  'suspended',
  'terminated',
  'inactive',
]);

export const createPartnerSchema = z.object({
  partnerName: z.string().min(1).max(255),
  displayName: z.string().max(255).optional(),
  partnerType: partnerTypeSchema,
  businessType: z.enum(['b2b', 'b2c', 'both']).optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updatePartnerSchema = createPartnerSchema.partial();

export const partnerIdParamsSchema = z.object({
  partnerId: z.string().uuid(),
});

export const getPartnersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  partnerType: partnerTypeSchema.optional(),
  status: partnerStatusSchema.optional(),
  tier: z.string().optional(),
  sortBy: z.enum(['partnerName', 'registrationDate', 'status']).default('registrationDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const approvePartnerSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional(),
});

export const partnerResponseSchema = z.object({
  partnerId: z.string().uuid(),
  partnerCode: z.string(),
  partnerName: z.string(),
  displayName: z.string().nullable(),
  partnerType: partnerTypeSchema,
  businessType: z.string().nullable(),
  status: partnerStatusSchema,
  tier: z.string().nullable(),
  registrationDate: z.date(),
  approvalDate: z.date().nullable(),
  logoUrl: z.string().nullable(),
  website: z.string().nullable(),
  description: z.string().nullable(),
  metadata: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const getPartnersResponseSchema = z.object({
  partners: z.array(partnerResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type PartnerType = z.infer<typeof partnerTypeSchema>;
export type PartnerStatus = z.infer<typeof partnerStatusSchema>;
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
export type PartnerResponse = z.infer<typeof partnerResponseSchema>;
export type GetPartnersQuery = z.infer<typeof getPartnersQuerySchema>;

