import { pgTable, uuid, varchar, integer, timestamp, date, boolean, text, jsonb } from 'drizzle-orm/pg-core';
import { partners } from './partners';

export const partnerBillingPlans = pgTable('partner_billing_plans', {
  planId: uuid('plan_id').primaryKey().defaultRandom(),
  planName: varchar('plan_name', { length: 255 }).notNull(),
  priceCents: integer('price_cents').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  features: jsonb('features').default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const partnerSubscriptions = pgTable('partner_subscriptions', {
  subscriptionId: uuid('subscription_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id')
    .references(() => partners.partnerId)
    .notNull(),
  planId: uuid('plan_id')
    .references(() => partnerBillingPlans.planId)
    .notNull(),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  billingCycle: varchar('billing_cycle', { length: 32 }).notNull().default('monthly'),
  nextBillingDate: timestamp('next_billing_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * What a partner owes for their subscription — generated per billing cycle. There is no real
 * payment-gateway integration in this backend (see routes/integrationStubs.ts), so collection is
 * tracked honestly via admin "mark paid + external reference", the same pattern already used for
 * commission payouts and MDF requests, rather than faking a Stripe/Razorpay API call.
 */
export const partnerBillingInvoices = pgTable('partner_billing_invoices', {
  invoiceId: uuid('invoice_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id')
    .references(() => partners.partnerId)
    .notNull(),
  subscriptionId: uuid('subscription_id')
    .references(() => partnerSubscriptions.subscriptionId)
    .notNull(),
  /** Snapshot of the plan at generation time — later plan price changes don't rewrite past invoices. */
  planName: varchar('plan_name', { length: 255 }).notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  dueDate: date('due_date').notNull(),
  /** unpaid | paid | void */
  status: varchar('status', { length: 20 }).notNull().default('unpaid'),
  paidAt: timestamp('paid_at'),
  paidReference: varchar('paid_reference', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const partnerApiKeys = pgTable('partner_api_keys', {
  keyId: uuid('key_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id')
    .references(() => partners.partnerId)
    .notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 16 }).notNull(),
  scopes: jsonb('scopes').default([]),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const partnerWebhooks = pgTable('partner_webhooks', {
  webhookId: uuid('webhook_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id')
    .references(() => partners.partnerId)
    .notNull(),
  url: text('url').notNull(),
  events: jsonb('events').notNull().default([]),
  secret: varchar('secret', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});
