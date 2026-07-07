import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

/** Dedup log so an expiring agreement gets at most one reminder per cadence step. */
export const agreementReminderLog = pgTable('agreement_reminder_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  agreementId: uuid('agreement_id').notNull(),
  reminderStep: varchar('reminder_step', { length: 20 }).notNull(),
  sentAt: timestamp('sent_at').defaultNow(),
});

/** A partner's self-service GDPR erasure request, reviewed by an admin before anonymization runs. */
export const dataErasureRequests = pgTable('data_erasure_requests', {
  requestId: uuid('request_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull(),
  requestedBy: uuid('requested_by'),
  reason: text('reason'),
  /** pending | approved | rejected */
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
