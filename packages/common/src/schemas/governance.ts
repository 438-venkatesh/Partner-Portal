import { z } from 'zod';

export const createCustomFieldDefinitionSchema = z.object({
  entityType: z.enum(['partner']).optional(),
  fieldKey: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, 'fieldKey must be lowercase snake_case'),
  label: z.string().min(1).max(200),
  fieldType: z.enum(['text', 'number', 'boolean', 'date', 'select']),
  options: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

export const updateCustomFieldDefinitionSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  options: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const bulkPartnerActionSchema = z.object({
  partnerIds: z.array(z.string().uuid()).min(1),
  action: z.enum(['approve', 'suspend', 'reactivate']),
  reason: z.string().max(500).optional(),
});

export const bulkDocumentVerifySchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1),
  verified: z.boolean(),
  notes: z.string().max(500).optional(),
});

export type CreateCustomFieldDefinitionInput = z.infer<typeof createCustomFieldDefinitionSchema>;
export type BulkPartnerActionInput = z.infer<typeof bulkPartnerActionSchema>;
export type BulkDocumentVerifyInput = z.infer<typeof bulkDocumentVerifySchema>;
