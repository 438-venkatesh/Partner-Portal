import { pgTable, uuid, varchar, text, decimal, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { suppliers } from './suppliers';

export const productStatusEnum = pgEnum('product_status', [
  'active',
  'inactive',
  'discontinued',
  'pending_approval',
]);

export const productCategoryEnum = pgEnum('product_category', [
  'raw_materials',
  'components',
  'finished_goods',
  'mro',
  'services',
  'other',
]);

// Supplier Product Catalog
export const supplierProducts = pgTable('supplier_products', {
  productId: uuid('product_id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').references(() => suppliers.supplierId).notNull(),
  productCode: varchar('product_code', { length: 100 }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  productCategory: productCategoryEnum('product_category').notNull(),
  description: text('description'),
  specifications: jsonb('specifications').default({}),
  unitOfMeasure: varchar('unit_of_measure', { length: 20 }).default('piece'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  minimumOrderQuantity: decimal('minimum_order_quantity', { precision: 10, scale: 2 }).default('1'),
  leadTimeDays: integer('lead_time_days'),
  status: productStatusEnum('status').default('pending_approval'),
  imageUrl: varchar('image_url', { length: 500 }),
  imageUrls: jsonb('image_urls').default([]),
  tags: jsonb('tags').default([]),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Product Catalog Sharing (which tenants can see which products)
export const productCatalogSharing = pgTable('product_catalog_sharing', {
  sharingId: uuid('sharing_id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').references(() => suppliers.supplierId).notNull(),
  tenantId: uuid('tenant_id').notNull(),
  productId: uuid('product_id').references(() => supplierProducts.productId), // nullable - null means all products
  sharedAt: timestamp('shared_at').defaultNow(),
  sharedBy: uuid('shared_by').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

