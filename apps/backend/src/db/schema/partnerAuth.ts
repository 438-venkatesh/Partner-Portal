import { pgTable, uuid, varchar, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { partners } from './partners';

// Partner user account status enum
export const partnerUserAccountStatusEnum = pgEnum('partner_user_account_status', [
  'pending_verification',
  'active',
  'suspended',
  'inactive',
  'deleted'
]);

// Partner user accounts table - stores email/password for partner users
export const partnerUserAccounts = pgTable('partner_user_accounts', {
  accountId: uuid('account_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  status: partnerUserAccountStatusEnum('status').default('pending_verification'),
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 100 }),
  emailVerificationExpires: timestamp('email_verification_expires'),
  passwordResetToken: varchar('password_reset_token', { length: 100 }),
  passwordResetExpires: timestamp('password_reset_expires'),
  lastLoginAt: timestamp('last_login_at'),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  /** Partner employee RBAC: admin | manager | member | viewer */
  role: varchar('role', { length: 32 }).default('member'),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  failedLoginAttempts: varchar('failed_login_attempts', { length: 10 }).default('0'),
  lockedUntil: timestamp('locked_until'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  acceptedTermsAt: timestamp('accepted_terms_at'),
  acceptedTermsVersion: varchar('accepted_terms_version', { length: 32 }),
});

// Service timeline/due dates tracking
export const serviceTimelines = pgTable('service_timelines', {
  timelineId: uuid('timeline_id').primaryKey().defaultRandom(),
  relationshipId: uuid('relationship_id').notNull(), // References partner_tenant_service_relationships
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull(),
  tenantId: uuid('tenant_id').notNull(),
  serviceId: uuid('service_id').notNull(),
  serviceType: varchar('service_type', { length: 100 }).notNull(), // e.g., 'auditing', 'fax_filing', 'maintenance'
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  dueDate: timestamp('due_date').notNull(),
  completedDate: timestamp('completed_date'),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'in_progress', 'completed', 'overdue', 'cancelled'
  priority: varchar('priority', { length: 20 }).default('medium'), // 'low', 'medium', 'high', 'urgent'
  recurrenceType: varchar('recurrence_type', { length: 50 }), // 'none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  recurrenceInterval: varchar('recurrence_interval', { length: 10 }), // e.g., '1', '2', '3'
  nextDueDate: timestamp('next_due_date'),
  assignedTo: uuid('assigned_to'), // Partner user account ID
  notes: text('notes'),
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});









