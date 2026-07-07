import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'inactive', 'suspended']);

export const tenants = pgTable('tenants', {
  tenantId: uuid('tenant_id').primaryKey().defaultRandom(),
  tenantCode: varchar('tenant_code', { length: 50 }).notNull().unique(),
  tenantName: varchar('tenant_name', { length: 255 }).notNull(),
  industry: varchar('industry', { length: 100 }),
  status: tenantStatusEnum('status').notNull().default('active'),
  contactEmail: varchar('contact_email', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});
