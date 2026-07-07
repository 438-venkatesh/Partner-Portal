import { pgTable, uuid, varchar, text, numeric, jsonb, boolean, date, timestamp } from 'drizzle-orm/pg-core';

/** Configurable commission rules — flat, percentage, or tiered/accelerator — matched by partner type/tier. */
export const commissionPlans = pgTable('commission_plans', {
  planId: uuid('plan_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  partnerType: varchar('partner_type', { length: 50 }),
  minTier: varchar('min_tier', { length: 50 }),
  /** percentage | flat | tiered */
  rateType: varchar('rate_type', { length: 20 }).notNull().default('percentage'),
  /** For percentage: e.g. 10.000 = 10%. For flat: an absolute currency amount. */
  rate: numeric('rate', { precision: 8, scale: 3 }),
  /** For tiered: [{ minAmount, rate }], highest matching minAmount wins — the accelerator pattern. */
  tieredRates: jsonb('tiered_rates').default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Every dollar owed to a partner — deal commissions, SPIFF rewards, and manual adjustments alike. */
export const commissionRecords = pgTable('commission_records', {
  recordId: uuid('record_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull(),
  dealId: uuid('deal_id'),
  planId: uuid('plan_id'),
  challengeId: uuid('challenge_id'),
  /** deal_commission | spiff | manual_adjustment */
  type: varchar('type', { length: 20 }).notNull().default('deal_commission'),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  description: text('description'),
  /** pending | approved | paid */
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  paidAt: timestamp('paid_at'),
  paidReference: varchar('paid_reference', { length: 200 }),
});

/** Time-boxed goals (PartnerStack-style "Challenges") that pay out points or a fixed amount on completion. */
export const incentiveChallenges = pgTable('incentive_challenges', {
  challengeId: uuid('challenge_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  /** deals_won | revenue */
  metric: varchar('metric', { length: 20 }).notNull(),
  target: numeric('target', { precision: 14, scale: 2 }).notNull(),
  /** points | fixed_amount */
  rewardType: varchar('reward_type', { length: 20 }).notNull(),
  rewardValue: numeric('reward_value', { precision: 14, scale: 2 }).notNull(),
  partnerType: varchar('partner_type', { length: 50 }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Records that a partner already claimed a challenge's reward, so it's never paid out twice. */
export const challengeCompletions = pgTable('challenge_completions', {
  completionId: uuid('completion_id').primaryKey().defaultRandom(),
  challengeId: uuid('challenge_id').notNull(),
  partnerId: uuid('partner_id').notNull(),
  completedAt: timestamp('completed_at').defaultNow(),
});
