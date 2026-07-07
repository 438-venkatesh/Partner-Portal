import { pgTable, uuid, varchar, text, integer, timestamp, date, jsonb, boolean, pgEnum, decimal } from 'drizzle-orm/pg-core';
import { partners } from './partners';
import { partnerServices } from './services';
import { partnerTenantServiceRelationships } from './services';

// Onboarding Workflow Stages Enum
export const onboardingStageEnum = pgEnum('onboarding_stage', [
  'registration',
  'service_selection',
  'initial_review',
  'documentation',
  'verification',
  'agreement',
  'app_access',
  'user_setup',
  'training',
  'testing',
  'go_live'
]);

// Onboarding Status Enum
export const onboardingStatusEnum = pgEnum('onboarding_status', [
  'pending',
  'in_progress',
  'completed',
  'blocked',
  'skipped'
]);

// Partner Onboarding Workflows Table
export const partnerOnboardingWorkflows = pgTable('partner_onboarding_workflows', {
  workflowId: uuid('workflow_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull().unique(),
  currentStage: onboardingStageEnum('current_stage').default('registration'),
  stageStatus: onboardingStatusEnum('stage_status').default('pending'),
  completedStages: jsonb('completed_stages').default([]),
  stageData: jsonb('stage_data').default({}),
  blockedReasons: text('blocked_reasons'),
  assignedTo: uuid('assigned_to'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Supplier Onboarding Stages Enum
export const supplierOnboardingStageEnum = pgEnum('supplier_onboarding_stage', [
  'supplier_registration',
  'catalog_setup',
  'supplier_documentation',
  'supplier_verification',
  'supplier_agreement',
  'payment_setup',
  'supplier_portal_access',
  'supplier_activation',
]);

// Supplier Onboarding Workflows Table
export const supplierOnboardingWorkflows = pgTable('supplier_onboarding_workflows', {
  workflowId: uuid('workflow_id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull().unique(),
  currentStage: supplierOnboardingStageEnum('current_stage').default('supplier_registration'),
  stageStatus: onboardingStatusEnum('stage_status').default('pending'),
  completedStages: jsonb('completed_stages').default([]),
  stageData: jsonb('stage_data').default({}),
  blockedReasons: text('blocked_reasons'),
  assignedTo: uuid('assigned_to'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Logistics Onboarding Stages Enum
export const logisticsOnboardingStageEnum = pgEnum('logistics_onboarding_stage', [
  'logistics_registration',
  'fleet_setup',
  'logistics_documentation',
  'logistics_verification',
  'logistics_agreement',
  'api_integration',
  'logistics_portal_access',
  'logistics_testing',
  'logistics_activation',
]);

// Logistics Onboarding Workflows Table
export const logisticsOnboardingWorkflows = pgTable('logistics_onboarding_workflows', {
  workflowId: uuid('workflow_id').primaryKey().defaultRandom(),
  logisticsId: uuid('logistics_id').notNull().unique(),
  currentStage: logisticsOnboardingStageEnum('current_stage').default('logistics_registration'),
  stageStatus: onboardingStatusEnum('stage_status').default('pending'),
  completedStages: jsonb('completed_stages').default([]),
  stageData: jsonb('stage_data').default({}),
  blockedReasons: text('blocked_reasons'),
  assignedTo: uuid('assigned_to'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Agreement Status Enum
export const agreementStatusEnum = pgEnum('agreement_status', [
  'draft',
  'pending_signature',
  'signed',
  'expired',
  'terminated',
  'cancelled'
]);

// Partner Agreements Table
export const partnerAgreements = pgTable('partner_agreements', {
  agreementId: uuid('agreement_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull(),
  tenantId: uuid('tenant_id'),
  relationshipId: uuid('relationship_id').references(() => partnerTenantServiceRelationships.relationshipId),
  agreementType: varchar('agreement_type', { length: 50 }).notNull(),
  agreementNumber: varchar('agreement_number', { length: 100 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  documentUrl: varchar('document_url', { length: 500 }),
  status: agreementStatusEnum('status').default('draft'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  autoRenew: boolean('auto_renew').default(false),
  renewalPeriodDays: integer('renewal_period_days'),
  terms: jsonb('terms').default({}),
  signedByPartner: uuid('signed_by_partner'),
  signedByTenant: uuid('signed_by_tenant'),
  signedByPlatform: uuid('signed_by_platform'),
  partnerSignedAt: timestamp('partner_signed_at'),
  tenantSignedAt: timestamp('tenant_signed_at'),
  platformSignedAt: timestamp('platform_signed_at'),
  /** Typed-name e-signature capture — the partner-side "sign" action records who typed what, from where. */
  partnerSignatureName: varchar('partner_signature_name', { length: 255 }),
  partnerSignatureIp: varchar('partner_signature_ip', { length: 45 }),
  partnerSignatureUserAgent: varchar('partner_signature_user_agent', { length: 500 }),
  eSignatureProvider: varchar('e_signature_provider', { length: 50 }),
  eSignatureDocumentId: varchar('e_signature_document_id', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Activity Type Enum
export const activityTypeEnum = pgEnum('activity_type', [
  'partner_created',
  'partner_updated',
  'partner_approved',
  'partner_suspended',
  'service_added',
  'service_removed',
  'document_uploaded',
  'document_verified',
  'agreement_signed',
  'permission_changed',
  'user_assigned',
  'user_removed',
  'status_changed',
  'onboarding_stage_completed',
  'partner_offboarded',
  'tier_changed',
  'document_deleted',
  'login',
  'other'
]);

// Partner Activity Logs Table
export const partnerActivityLogs = pgTable('partner_activity_logs', {
  logId: uuid('log_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull(),
  tenantId: uuid('tenant_id'),
  activityType: activityTypeEnum('activity_type').notNull(),
  activityDescription: text('activity_description').notNull(),
  performedBy: uuid('performed_by').notNull(),
  performedByType: varchar('performed_by_type', { length: 20 }).notNull(), // 'partner_user', 'tenant_user', 'platform_admin'
  metadata: jsonb('metadata').default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Service Performance Tracking Table
export const servicePerformanceTracking = pgTable('service_performance_tracking', {
  trackingId: uuid('tracking_id').primaryKey().defaultRandom(),
  relationshipId: uuid('relationship_id').references(() => partnerTenantServiceRelationships.relationshipId).notNull(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull(),
  tenantId: uuid('tenant_id').notNull(),
  serviceId: uuid('service_id').references(() => partnerServices.serviceId).notNull(),
  trackingPeriod: varchar('tracking_period', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly', 'yearly'
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  metrics: jsonb('metrics').default({}),
  revenue: jsonb('revenue').default({}),
  transactions: integer('transactions').default(0),
  successRate: decimal('success_rate', { precision: 5, scale: 2 }),
  averageResponseTime: integer('average_response_time'), // in seconds
  customerSatisfaction: decimal('customer_satisfaction', { precision: 3, scale: 2 }), // 0-5 scale
  slaCompliance: decimal('sla_compliance', { precision: 5, scale: 2 }), // percentage
  issuesCount: integer('issues_count').default(0),
  resolvedIssuesCount: integer('resolved_issues_count').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Permission Change Audit Logs Table
export const permissionChangeAuditLogs = pgTable('permission_change_audit_logs', {
  auditId: uuid('audit_id').primaryKey().defaultRandom(),
  relationshipId: uuid('relationship_id').references(() => partnerTenantServiceRelationships.relationshipId).notNull(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull(),
  tenantId: uuid('tenant_id').notNull(),
  changeType: varchar('change_type', { length: 20 }).notNull(), // 'added', 'removed', 'modified'
  permissionType: varchar('permission_type', { length: 50 }).notNull(), // 'application', 'module', 'feature', 'data'
  permissionKey: varchar('permission_key', { length: 100 }).notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  reason: text('reason'),
  changedBy: uuid('changed_by').notNull(),
  changedByType: varchar('changed_by_type', { length: 20 }).notNull(), // 'partner_admin', 'tenant_admin', 'platform_admin'
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  effectiveDate: timestamp('effective_date').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Context Type Enum
export const contextTypeEnum = pgEnum('context_type', [
  'partner',
  'tenant'
]);

// Context Switching Table
export const contextSwitching = pgTable('context_switching', {
  switchId: uuid('switch_id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  partnerId: uuid('partner_id').references(() => partners.partnerId),
  tenantId: uuid('tenant_id'),
  currentContext: contextTypeEnum('current_context').notNull(),
  previousContext: contextTypeEnum('previous_context'),
  switchedAt: timestamp('switched_at').defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').default({}),
});

// Calendar Event Type Enum
export const calendarEventTypeEnum = pgEnum('calendar_event_type', [
  'meeting',
  'deadline',
  'milestone',
  'review',
  'training',
  'onboarding',
  'renewal',
  'other'
]);

// Partner Calendar Events Table
export const partnerCalendarEvents = pgTable('partner_calendar_events', {
  eventId: uuid('event_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull(),
  tenantId: uuid('tenant_id'),
  relationshipId: uuid('relationship_id').references(() => partnerTenantServiceRelationships.relationshipId),
  eventType: calendarEventTypeEnum('event_type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  allDay: boolean('all_day').default(false),
  location: varchar('location', { length: 255 }),
  attendees: jsonb('attendees').default([]),
  reminderMinutes: integer('reminder_minutes'), // minutes before event
  reminderSent: boolean('reminder_sent').default(false),
  reminderSentAt: timestamp('reminder_sent_at'),
  status: varchar('status', { length: 20 }).default('scheduled'), // 'scheduled', 'completed', 'cancelled', 'postponed'
  createdBy: uuid('created_by').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


