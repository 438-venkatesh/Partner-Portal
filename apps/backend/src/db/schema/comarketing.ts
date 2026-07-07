import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

/** A partner-branded landing page built from a pre-approved co-brandable asset — captures its own leads. */
export const coMarketingPages = pgTable('co_marketing_pages', {
  pageId: uuid('page_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull(),
  /** Must reference a marketing_assets row with allow_co_branding = true, or null for a plain page. */
  assetId: uuid('asset_id'),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  headline: varchar('headline', { length: 200 }).notNull(),
  description: text('description'),
  ctaLabel: varchar('cta_label', { length: 100 }).default('Request a consultation'),
  isActive: boolean('is_active').default(true),
  viewCount: integer('view_count').default(0),
  leadCount: integer('lead_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** A shareable, UTM-tagged referral/campaign link a partner hands out — the attribution unit. */
export const referralLinks = pgTable('referral_links', {
  linkId: uuid('link_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull(),
  code: varchar('code', { length: 30 }).notNull().unique(),
  campaignName: varchar('campaign_name', { length: 200 }).notNull(),
  utmSource: varchar('utm_source', { length: 100 }),
  utmMedium: varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  /** If set, the link forwards to this partner's co-marketing page; otherwise to targetUrl. */
  pageId: uuid('page_id'),
  targetUrl: varchar('target_url', { length: 500 }),
  clickCount: integer('click_count').default(0),
  leadCount: integer('lead_count').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
