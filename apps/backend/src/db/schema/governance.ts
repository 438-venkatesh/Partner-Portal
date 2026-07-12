import { pgTable, uuid, varchar, jsonb, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

/**
 * Narrow automation rule (same class as autoApprovalService / lead routing rules /
 * incentive challenges) — flags partners with no login activity for N days as inactive
 * and, if enabled, auto-suspends them. Not a generic workflow engine.
 */
export const partnerAutoSuspendRules = pgTable('partner_auto_suspend_rules', {
  ruleId: uuid('rule_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  inactivityDays: integer('inactivity_days').notNull().default(90),
  autoSuspend: boolean('auto_suspend').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Platform-level audit trail — distinct from partner_activity_logs, which requires a partnerId
 * and can't record actions that aren't tied to a specific partner (admin account changes, tenant
 * CRUD, billing/commission plan edits).
 */
export const platformAuditLogs = pgTable('platform_audit_logs', {
  auditId: uuid('audit_id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').notNull(),
  actorEmail: varchar('actor_email', { length: 255 }),
  action: varchar('action', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Admin-defined extra fields for core entities. Values are stored in the entity's own jsonb
 * column (e.g. partners.metadata) keyed by fieldKey — this table only defines what fields exist,
 * their label/type, so the UI can render them consistently instead of a raw JSON blob.
 */
export const customFieldDefinitions = pgTable('custom_field_definitions', {
  fieldId: uuid('field_id').primaryKey().defaultRandom(),
  /** Which entity this field applies to — 'partner' is the only supported value today. */
  entityType: varchar('entity_type', { length: 50 }).notNull().default('partner'),
  fieldKey: varchar('field_key', { length: 100 }).notNull(),
  label: varchar('label', { length: 200 }).notNull(),
  /** text | number | boolean | date | select */
  fieldType: varchar('field_type', { length: 20 }).notNull().default('text'),
  options: jsonb('options').default([]),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
