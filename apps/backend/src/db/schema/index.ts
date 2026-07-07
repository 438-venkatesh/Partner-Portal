// Export all schema files
export * from './partners';
export * from './suppliers';
export * from './logistics';
export * from './services';
export * from './documents';
export * from './advanced';
export * from './products';
export * from './invoices';
export * from './partnerAuth';
export * from './adminUsers';
export * from './notifications';
export * from './tenants';
export * from './commercial';
export * from './onboardingConfig';
export * from './partnerRelationship';
export * from './dealRegistration';
export * from './commissions';
export * from './mdf';
export * from './training';
export * from './enablementContent';
export * from './comarketing';

// Re-export for convenience
import { partners, partnerUsers } from './partners';
import { suppliers, purchaseOrders } from './suppliers';
import { logisticsPartners, shipments, shipmentTrackingEvents } from './logistics';
import { partnerServices, partnerServiceOfferings, partnerTenantServiceRelationships } from './services';
import { partnerDocuments } from './documents';
import { supplierProducts, productCatalogSharing } from './products';
import { supplierInvoices, invoicePayments } from './invoices';
import {
  partnerOnboardingWorkflows,
  supplierOnboardingWorkflows,
  logisticsOnboardingWorkflows,
  partnerAgreements,
  partnerActivityLogs,
  servicePerformanceTracking,
  permissionChangeAuditLogs,
  contextSwitching,
  partnerCalendarEvents,
} from './advanced';
import { partnerUserAccounts, serviceTimelines } from './partnerAuth';
import { adminUsers } from './adminUsers';
import { notifications } from './notifications';
import { tenants } from './tenants';
import {
  partnerBillingPlans,
  partnerSubscriptions,
  partnerApiKeys,
  partnerWebhooks,
} from './commercial';
import {
  onboardingStageSettings,
  partnerAutoApprovalRules,
  onboardingReminderLog,
} from './onboardingConfig';
import {
  partnerTierDefinitions,
  partnerSegments,
  partnerBusinessPlans,
  partnerRewardTransactions,
} from './partnerRelationship';
import { deals, leads, leadRoutingRules } from './dealRegistration';
import {
  commissionPlans,
  commissionRecords,
  incentiveChallenges,
  challengeCompletions,
} from './commissions';
import { mdfFunds, mdfRequests } from './mdf';
import {
  trainingCourses,
  trainingLessons,
  trainingQuizQuestions,
  trainingEnrollments,
  learningPaths,
} from './training';
import { salesPlaybooks, marketingAssets } from './enablementContent';
import { coMarketingPages, referralLinks } from './comarketing';

export const schema = {
  partners,
  partnerUsers,
  partnerUserAccounts,
  adminUsers,
  notifications,
  tenants,
  partnerBillingPlans,
  partnerSubscriptions,
  partnerApiKeys,
  partnerWebhooks,
  serviceTimelines,
  suppliers,
  logisticsPartners,
  purchaseOrders,
  shipments,
  shipmentTrackingEvents,
  partnerServices,
  partnerServiceOfferings,
  partnerTenantServiceRelationships,
  partnerDocuments,
  supplierProducts,
  productCatalogSharing,
  supplierInvoices,
  invoicePayments,
  partnerOnboardingWorkflows,
  supplierOnboardingWorkflows,
  logisticsOnboardingWorkflows,
  partnerAgreements,
  partnerActivityLogs,
  servicePerformanceTracking,
  permissionChangeAuditLogs,
  contextSwitching,
  partnerCalendarEvents,
  onboardingStageSettings,
  partnerAutoApprovalRules,
  onboardingReminderLog,
  partnerTierDefinitions,
  partnerSegments,
  partnerBusinessPlans,
  partnerRewardTransactions,
  deals,
  leads,
  leadRoutingRules,
  commissionPlans,
  commissionRecords,
  incentiveChallenges,
  challengeCompletions,
  mdfFunds,
  mdfRequests,
  trainingCourses,
  trainingLessons,
  trainingQuizQuestions,
  trainingEnrollments,
  learningPaths,
  salesPlaybooks,
  marketingAssets,
  coMarketingPages,
  referralLinks,
};
