import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { partners } from './partners';
import { partnerUserAccounts } from './partnerAuth';

export const notifications = pgTable('notifications', {
  notificationId: uuid('notification_id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => partnerUserAccounts.accountId)
    .notNull(),
  partnerId: uuid('partner_id')
    .references(() => partners.partnerId)
    .notNull(),
  type: varchar('type', { length: 64 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  isRead: boolean('is_read').notNull().default(false),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});
