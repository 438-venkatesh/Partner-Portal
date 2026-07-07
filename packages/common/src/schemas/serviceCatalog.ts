import { z } from 'zod';

export const createServiceSchema = z.object({
  serviceCode: z.string().min(1).max(50),
  serviceName: z.string().min(1).max(100),
  serviceCategory: z.string().min(1).max(50),
  description: z.string().optional(),
  requiredDocuments: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const serviceImportRowSchema = z.object({
  serviceCode: z.string().min(1).max(50),
  serviceName: z.string().min(1).max(100),
  serviceCategory: z.string().min(1).max(50),
  description: z.string().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type ServiceImportRow = z.infer<typeof serviceImportRowSchema>;
