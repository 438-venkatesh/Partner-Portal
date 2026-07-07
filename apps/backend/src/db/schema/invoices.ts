import { pgTable, uuid, varchar, decimal, timestamp, date, text, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { suppliers } from './suppliers';
import { purchaseOrders } from './suppliers';

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'sent',
  'pending',
  'partial',
  'paid',
  'overdue',
  'cancelled',
  'disputed',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'partial',
  'paid',
  'failed',
  'refunded',
]);

// Supplier Invoices
export const supplierInvoices = pgTable('supplier_invoices', {
  invoiceId: uuid('invoice_id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').references(() => suppliers.supplierId).notNull(),
  tenantId: uuid('tenant_id').notNull(),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull().unique(),
  poId: uuid('po_id').references(() => purchaseOrders.poId),
  invoiceDate: date('invoice_date').defaultNow(),
  dueDate: date('due_date').notNull(),
  status: invoiceStatusEnum('status').default('draft'),
  paymentStatus: paymentStatusEnum('payment_status').default('pending'),
  items: jsonb('items').notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 3 }).default('USD'),
  paymentTerms: varchar('payment_terms', { length: 50 }),
  billingAddress: jsonb('billing_address'),
  notes: text('notes'),
  sentAt: timestamp('sent_at'),
  paidAt: timestamp('paid_at'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Invoice Payments
export const invoicePayments = pgTable('invoice_payments', {
  paymentId: uuid('payment_id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => supplierInvoices.invoiceId).notNull(),
  paymentAmount: decimal('payment_amount', { precision: 12, scale: 2 }).notNull(),
  paymentDate: date('payment_date').defaultNow(),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paymentReference: varchar('payment_reference', { length: 100 }),
  transactionId: varchar('transaction_id', { length: 255 }),
  status: paymentStatusEnum('status').default('pending'),
  notes: text('notes'),
  processedBy: uuid('processed_by'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});









