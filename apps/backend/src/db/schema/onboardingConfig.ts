import { pgTable, uuid, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

/**
 * Admin-configurable per-stage overrides (enable/disable, reorder, relabel) layered on top of
 * the default onboarding flow for a partner type. Absence of a row for a (partnerType, stageCode)
 * pair means "use the built-in default" — see applyStageOverrides() in @partner-portal/common.
 */
export const onboardingStageSettings = pgTable('onboarding_stage_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerType: varchar('partner_type', { length: 50 }).notNull(),
  stageCode: varchar('stage_code', { length: 50 }).notNull(),
  label: varchar('label', { length: 200 }),
  description: text('description'),
  isEnabled: boolean('is_enabled'),
  sortOrder: integer('sort_order'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Rules that let a pending partner auto-activate once onboarding is complete, without a manual click. */
export const partnerAutoApprovalRules = pgTable('partner_auto_approval_rules', {
  ruleId: uuid('rule_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  partnerType: varchar('partner_type', { length: 50 }),
  minTier: varchar('min_tier', { length: 50 }),
  requireDocumentsVerified: boolean('require_documents_verified').default(true),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** De-dupes onboarding nudge emails so a stalled partner isn't reminded more than once per cadence step. */
export const onboardingReminderLog = pgTable('onboarding_reminder_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull(),
  stage: varchar('stage', { length: 50 }).notNull(),
  reminderStep: varchar('reminder_step', { length: 20 }).notNull(),
  sentAt: timestamp('sent_at').defaultNow(),
});
