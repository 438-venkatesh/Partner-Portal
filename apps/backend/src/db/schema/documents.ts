import { pgTable, uuid, varchar, text, integer, timestamp, date } from 'drizzle-orm/pg-core';
import { partners } from './partners';

export const partnerDocuments = pgTable('partner_documents', {
  documentId: uuid('document_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull(),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  documentName: varchar('document_name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  /** Bucket object key for signed URL generation */
  storageKey: varchar('storage_key', { length: 500 }),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  version: varchar('version', { length: 20 }).default('1.0'),
  expiryDate: date('expiry_date'),
  status: varchar('status', { length: 20 }).default('pending'),
  verifiedBy: uuid('verified_by'),
  verifiedAt: timestamp('verified_at'),
  uploadedBy: uuid('uploaded_by'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

