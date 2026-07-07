import { z } from 'zod';

export const supplierCategorySchema = z.enum([
  'raw_materials',
  'components',
  'finished_goods',
  'mro',
  'services',
  'other',
]);

export const poStatusSchema = z.enum([
  'draft',
  'sent',
  'acknowledged',
  'confirmed',
  'partial',
  'completed',
  'cancelled',
  'closed',
]);

export const createSupplierSchema = z.object({
  partnerId: z.string().uuid(),
  supplierCategory: supplierCategorySchema,
  supplierTier: z.enum(['tier1', 'tier2', 'tier3', 'strategic', 'preferred']).optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.number().positive().optional(),
  currency: z.string().length(3).default('USD'),
  leadTimeDays: z.number().int().positive().optional(),
  minimumOrderQuantity: z.number().positive().optional(),
  supplyRegions: z.array(z.string()).default([]),
  productCatalogUrl: z.string().url().optional(),
});

export const poItemSchema = z.object({
  itemId: z.string().uuid(),
  productCode: z.string(),
  productName: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  description: z.string().optional(),
});

export const createPurchaseOrderSchema = z.object({
  tenantId: z.string().uuid(),
  supplierId: z.string().uuid(),
  requisitionId: z.string().uuid().optional(),
  poDate: z.date().default(() => new Date()),
  deliveryDate: z.date(),
  deliveryAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }),
  billingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }).optional(),
  items: z.array(poItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().default(0),
  shippingAmount: z.number().nonnegative().default(0),
  discountAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  paymentTerms: z.string().optional(),
  incoterms: z.string().optional(),
  notes: z.string().optional(),
});

export const acknowledgePOSchema = z.object({
  acknowledged: z.boolean(),
  modifications: z.object({
    items: z.array(poItemSchema).optional(),
    deliveryDate: z.date().optional(),
    notes: z.string().optional(),
  }).optional(),
  rejectionReason: z.string().optional(),
});

export const getPOsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: poStatusSchema.optional(),
  supplierId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(['poDate', 'deliveryDate', 'totalAmount']).default('poDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type SupplierCategory = z.infer<typeof supplierCategorySchema>;
export type POStatus = z.infer<typeof poStatusSchema>;
export type CreatePOInput = z.infer<typeof createPurchaseOrderSchema>;
export type AcknowledgePOInput = z.infer<typeof acknowledgePOSchema>;
export type GetPOsQuery = z.infer<typeof getPOsQuerySchema>;

