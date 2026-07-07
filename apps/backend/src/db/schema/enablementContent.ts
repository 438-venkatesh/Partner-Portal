import { pgTable, uuid, varchar, text, integer, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';

/** Guided-selling content tied to where a deal sits — "what to do, what to use" at each stage. */
export const salesPlaybooks = pgTable('sales_playbooks', {
  playbookId: uuid('playbook_id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  /** A deals.status value (pending_review | approved | won | lost), or null = applies at every stage. */
  dealStage: varchar('deal_stage', { length: 20 }),
  partnerType: varchar('partner_type', { length: 50 }),
  content: text('content').notNull(),
  recommendedAssetIds: jsonb('recommended_asset_ids').default([]),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** The co-marketing/sales asset library — logos, datasheets, case studies, decks. */
export const marketingAssets = pgTable('marketing_assets', {
  assetId: uuid('asset_id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull().default('other'),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  partnerType: varchar('partner_type', { length: 50 }),
  minTier: varchar('min_tier', { length: 50 }),
  tags: jsonb('tags').default([]),
  downloadCount: integer('download_count').default(0),
  /** Whether a partner may generate a co-branded microsite from this asset. */
  allowCoBranding: boolean('allow_co_branding').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
