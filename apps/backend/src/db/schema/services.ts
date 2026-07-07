import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, date, pgEnum, integer, decimal } from 'drizzle-orm/pg-core';
import { partners } from './partners';

export const serviceStatusEnum = pgEnum('service_status', [
  'pending', 'active', 'suspended', 'terminated', 'expired'
]);

export const partnerServices = pgTable('partner_services', {
  serviceId: uuid('service_id').primaryKey().defaultRandom(),
  serviceCode: varchar('service_code', { length: 50 }).notNull().unique(),
  serviceName: varchar('service_name', { length: 100 }).notNull(),
  serviceCategory: varchar('service_category', { length: 50 }).notNull(),
  description: text('description'),
  requiredDocuments: jsonb('required_documents').default([]),
  applications: jsonb('applications').default([]),
  defaultPermissions: jsonb('default_permissions').default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const partnerServiceOfferings = pgTable('partner_service_offerings', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull(),
  serviceId: uuid('service_id').references(() => partnerServices.serviceId).notNull(),
  status: varchar('status', { length: 20 }).default('active'),
  certificationLevel: varchar('certification_level', { length: 50 }),
  yearsExperience: integer('years_experience'),
  specializations: jsonb('specializations').default([]),
  pricingModel: varchar('pricing_model', { length: 50 }),
  rate: decimal('rate', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const partnerTenantServiceRelationships = pgTable('partner_tenant_service_relationships', {
  relationshipId: uuid('relationship_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull(),
  tenantId: uuid('tenant_id').notNull(),
  serviceId: uuid('service_id').references(() => partnerServices.serviceId).notNull(),
  status: serviceStatusEnum('status').default('pending'),
  requestedBy: varchar('requested_by', { length: 20 }).notNull(),
  requestedByUser: uuid('requested_by_user').notNull(),
  requestedServices: jsonb('requested_services').notNull(),
  approvedServices: jsonb('approved_services').default([]),
  applications: jsonb('applications').default([]),
  modules: jsonb('modules').default({}),
  permissions: jsonb('permissions').default({}),
  customPermissions: jsonb('custom_permissions').default({}),
  startDate: date('start_date'),
  endDate: date('end_date'),
  gracePeriodDays: integer('grace_period_days'),
  terminationDate: date('termination_date'),
  terminationReason: text('termination_reason'),
  terminationInitiatedBy: uuid('termination_initiated_by'),
  approvalStatus: jsonb('approval_status').default({}),
  approvedByTenantAdmin: uuid('approved_by_tenant_admin'),
  approvedByPartnerAdmin: uuid('approved_by_partner_admin'),
  approvedByPlatformAdmin: uuid('approved_by_platform_admin'),
  tenantApprovedAt: timestamp('tenant_approved_at'),
  partnerApprovedAt: timestamp('partner_approved_at'),
  platformApprovedAt: timestamp('platform_approved_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

