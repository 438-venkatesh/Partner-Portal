import { pgTable, uuid, varchar, text, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

/** A budget pool admins allocate MDF requests against (e.g. "Q1 2026 co-marketing fund"). */
export const mdfFunds = pgTable('mdf_funds', {
  fundId: uuid('fund_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  totalBudget: numeric('total_budget', { precision: 14, scale: 2 }).notNull(),
  remainingBudget: numeric('remaining_budget', { precision: 14, scale: 2 }).notNull(),
  fiscalPeriod: varchar('fiscal_period', { length: 50 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Request → approval → claim, linkable to a deal so ROI (revenue per dollar spent) is computable. */
export const mdfRequests = pgTable('mdf_requests', {
  requestId: uuid('request_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull(),
  fundId: uuid('fund_id').notNull(),
  dealId: uuid('deal_id'),
  campaignName: varchar('campaign_name', { length: 255 }).notNull(),
  description: text('description'),
  requestedAmount: numeric('requested_amount', { precision: 14, scale: 2 }).notNull(),
  approvedAmount: numeric('approved_amount', { precision: 14, scale: 2 }),
  /** submitted | approved | rejected | claimed | paid */
  status: varchar('status', { length: 20 }).notNull().default('submitted'),
  proofOfExpenseUrl: varchar('proof_of_expense_url', { length: 500 }),
  rejectionReason: text('rejection_reason'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  claimedAt: timestamp('claimed_at'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
