import { pgTable, uuid, varchar, decimal, integer, jsonb, boolean, timestamp, date, pgEnum, time, text } from 'drizzle-orm/pg-core';
import { partners } from './partners';

export const supplierCategoryEnum = pgEnum('supplier_category', [
  'raw_materials', 'components', 'finished_goods', 'mro', 'services', 'other'
]);

export const poStatusEnum = pgEnum('po_status', [
  'draft', 'sent', 'acknowledged', 'confirmed', 'partial', 'completed', 'cancelled', 'closed'
]);

export const suppliers = pgTable('suppliers', {
  supplierId: uuid('supplier_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull().unique(),
  supplierCode: varchar('supplier_code', { length: 50 }).notNull().unique(),
  supplierCategory: supplierCategoryEnum('supplier_category').notNull(),
  supplierTier: varchar('supplier_tier', { length: 20 }),
  certificationStatus: jsonb('certification_status').default({}),
  paymentTerms: varchar('payment_terms', { length: 50 }),
  creditLimit: decimal('credit_limit', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  leadTimeDays: integer('lead_time_days'),
  minimumOrderQuantity: decimal('minimum_order_quantity', { precision: 10, scale: 2 }),
  supplyRegions: jsonb('supply_regions').default([]),
  productCatalogUrl: varchar('product_catalog_url', { length: 500 }),
  supplierPortalEnabled: boolean('supplier_portal_enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const purchaseOrders = pgTable('purchase_orders', {
  poId: uuid('po_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.supplierId).notNull(),
  poNumber: varchar('po_number', { length: 100 }).notNull().unique(),
  requisitionId: uuid('requisition_id'),
  status: poStatusEnum('status').default('draft'),
  poDate: date('po_date').defaultNow(),
  deliveryDate: date('delivery_date'),
  deliveryAddress: jsonb('delivery_address').notNull(),
  billingAddress: jsonb('billing_address'),
  items: jsonb('items').notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
  shippingAmount: decimal('shipping_amount', { precision: 12, scale: 2 }).default('0'),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  paymentTerms: varchar('payment_terms', { length: 50 }),
  incoterms: varchar('incoterms', { length: 20 }),
  createdBy: uuid('created_by'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  acknowledgedBy: uuid('acknowledged_by'),
  acknowledgedAt: timestamp('acknowledged_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

