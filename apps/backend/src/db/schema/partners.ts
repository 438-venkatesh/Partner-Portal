import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, pgEnum, date, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const partnerTypeEnum = pgEnum('partner_type', [
  'agency', 'reseller', 'integrator', 'consultant', 'affiliate',
  'supplier', 'logistics_partner', 'supplier_logistics'
]);

export const partnerStatusEnum = pgEnum('partner_status', [
  'pending', 'active', 'suspended', 'terminated', 'inactive'
]);

export const partners = pgTable('partners', {
  partnerId: uuid('partner_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  partnerCode: varchar('partner_code', { length: 50 }).notNull().unique(),
  partnerName: varchar('partner_name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  partnerType: partnerTypeEnum('partner_type').notNull(),
  businessType: varchar('business_type', { length: 50 }),
  status: partnerStatusEnum('status').default('pending'),
  tier: varchar('tier', { length: 50 }),
  registrationDate: timestamp('registration_date').defaultNow(),
  approvalDate: timestamp('approval_date'),
  approvedBy: uuid('approved_by'),
  logoUrl: varchar('logo_url', { length: 500 }),
  website: varchar('website', { length: 255 }),
  description: text('description'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
  dataRetentionDays: integer('data_retention_days'),
});

export const partnerUsers = pgTable('partner_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull(),
  userId: uuid('user_id').notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  isPrimaryContact: boolean('is_primary_contact').default(false),
  isBillingContact: boolean('is_billing_contact').default(false),
  isTechnicalContact: boolean('is_technical_contact').default(false),
  status: varchar('status', { length: 20 }).default('active'),
  invitedBy: uuid('invited_by'),
  invitedAt: timestamp('invited_at'),
  joinedAt: timestamp('joined_at'),
  lastActiveAt: timestamp('last_active_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const partnersRelations = relations(partners, ({ many }) => ({
  partnerUsers: many(partnerUsers),
}));

