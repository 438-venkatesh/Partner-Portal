import { pgTable, uuid, varchar, text, numeric, date, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';

/** A partner-registered opportunity — the core PRM "deal registration" object. */
export const deals = pgTable('deals', {
  dealId: uuid('deal_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull(),
  tenantId: uuid('tenant_id'),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  dealName: varchar('deal_name', { length: 255 }).notNull(),
  estimatedValue: numeric('estimated_value', { precision: 14, scale: 2 }),
  actualValue: numeric('actual_value', { precision: 14, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  expectedCloseDate: date('expected_close_date'),
  /** pending_review | approved | rejected | won | lost | expired */
  status: varchar('status', { length: 20 }).notNull().default('pending_review'),
  /** Set on approval = approvedAt + the fund's/platform's protection window. Null once resolved. */
  protectionExpiresAt: timestamp('protection_expires_at'),
  notes: text('notes'),
  submittedBy: uuid('submitted_by'),
  registeredOnBehalfBy: uuid('registered_on_behalf_by'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  resolvedAt: timestamp('resolved_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** An inbound prospect the platform routes to a partner, rather than a partner-sourced deal. */
export const leads = pgTable('leads', {
  leadId: uuid('lead_id').primaryKey().defaultRandom(),
  source: varchar('source', { length: 50 }).default('manual'),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  tenantId: uuid('tenant_id'),
  assignedPartnerId: uuid('assigned_partner_id'),
  /** new | assigned | accepted | rejected | converted | expired */
  status: varchar('status', { length: 20 }).notNull().default('new'),
  routingRuleId: uuid('routing_rule_id'),
  /** Set when `source` is 'referral' or 'co_marketing_page' — which link/page attributed this lead. */
  referralLinkId: uuid('referral_link_id'),
  coMarketingPageId: uuid('co_marketing_page_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  assignedAt: timestamp('assigned_at'),
  respondedAt: timestamp('responded_at'),
});

/** Criteria-based round-robin routing: a lead matching this rule goes to the next eligible partner. */
export const leadRoutingRules = pgTable('lead_routing_rules', {
  ruleId: uuid('rule_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  partnerType: varchar('partner_type', { length: 50 }),
  minTier: varchar('min_tier', { length: 50 }),
  tags: jsonb('tags').default([]),
  isActive: boolean('is_active').default(true),
  lastAssignedPartnerId: uuid('last_assigned_partner_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
