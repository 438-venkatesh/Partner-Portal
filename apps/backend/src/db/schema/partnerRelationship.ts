import { pgTable, uuid, varchar, text, integer, numeric, boolean, jsonb, date, timestamp } from 'drizzle-orm/pg-core';

/** Admin-defined tiers (bronze/silver/gold/...), their benefits, and the criteria that auto-promote a partner into one. */
export const partnerTierDefinitions = pgTable('partner_tier_definitions', {
  tierCode: varchar('tier_code', { length: 50 }).primaryKey(),
  label: varchar('label', { length: 100 }).notNull(),
  description: text('description'),
  rank: integer('rank').notNull(),
  badgeColor: varchar('badge_color', { length: 20 }).default('secondary'),
  benefits: jsonb('benefits').default([]),
  minTenureDays: integer('min_tenure_days'),
  minVerifiedDocuments: integer('min_verified_documents'),
  minRewardPoints: integer('min_reward_points'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** A saved filter — "dynamic group" — over the partner list; membership is computed on read, not stored. */
export const partnerSegments = pgTable('partner_segments', {
  segmentId: uuid('segment_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  criteria: jsonb('criteria').notNull().default({}),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** A shared, trackable goal between the platform and a partner (Impartner-style "Business Planning"). */
export const partnerBusinessPlans = pgTable('partner_business_plans', {
  planId: uuid('plan_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  targetMetric: varchar('target_metric', { length: 100 }),
  targetValue: numeric('target_value', { precision: 14, scale: 2 }),
  currentValue: numeric('current_value', { precision: 14, scale: 2 }).default('0'),
  targetDate: date('target_date'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Append-only ledger of reward-point awards/redemptions; balance is always SUM(points), never stored, to avoid drift. */
export const partnerRewardTransactions = pgTable('partner_reward_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull(),
  points: integer('points').notNull(),
  reason: text('reason').notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
});
