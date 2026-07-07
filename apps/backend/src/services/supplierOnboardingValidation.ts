import { db } from '../db';
import { partners } from '../db/schema/partners';
import { suppliers } from '../db/schema/suppliers';
import { partnerDocuments } from '../db/schema/documents';
import { partnerAgreements } from '../db/schema';
import { supplierProducts } from '../db/schema/products';
import { eq, and, sql } from 'drizzle-orm';
import {
  SUPPLIER_CATALOG_MIN_PRODUCTS,
  SUPPLIER_REQUIRED_DOCUMENT_TYPES,
  type SupplierOnboardingStageCode,
} from '@partner-portal/common';
import { partnerAuthService } from './partnerAuthService';
import {
  formatMissingDocumentTypes,
  getMissingApprovedRequiredDocumentTypes,
} from './documentReviewRequirements';
import { partnerHasCountersignedAgreement, partnerHasPartnerSignedAgreement } from './agreementReviewRequirements';

export class StageValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: string[]
  ) {
    super(message);
    this.name = 'StageValidationError';
  }
}

export async function validateSupplierStageCompletion(
  stage: SupplierOnboardingStageCode,
  supplierId: string,
  partnerId: string,
  stageData: Record<string, unknown>
): Promise<void> {
  const errors: string[] = [];

  switch (stage) {
    case 'supplier_registration': {
      const org = await partnerAuthService.getOrganization(partnerId);
      if (!org?.partnerName?.trim()) errors.push('Company name is required');
      const [sup] = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.supplierId, supplierId))
        .limit(1);
      if (!sup?.supplierCategory) errors.push('Supplier category is required');
      if (stageData.acceptedTerms !== true) errors.push('You must accept the supplier terms');
      break;
    }
    case 'catalog_setup': {
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(supplierProducts)
        .where(eq(supplierProducts.supplierId, supplierId));
      const count = Number(countRow?.count ?? 0);
      if (count < SUPPLIER_CATALOG_MIN_PRODUCTS) {
        errors.push(`Add at least ${SUPPLIER_CATALOG_MIN_PRODUCTS} products (currently ${count})`);
      }
      break;
    }
    case 'supplier_documentation': {
      const docs = await db
        .select({ documentType: partnerDocuments.documentType })
        .from(partnerDocuments)
        .where(eq(partnerDocuments.partnerId, partnerId));
      const types = new Set(docs.map((d) => d.documentType));
      for (const required of SUPPLIER_REQUIRED_DOCUMENT_TYPES) {
        if (!types.has(required)) {
          errors.push(`Missing document: ${required.replace(/_/g, ' ')}`);
        }
      }
      break;
    }
    case 'supplier_verification':
      errors.push('Verification is completed by platform administrators');
      break;
    case 'supplier_agreement': {
      const signed = await partnerHasPartnerSignedAgreement(partnerId);
      if (!signed) {
        errors.push('Sign at least one supplier agreement before submitting');
      }
      break;
    }
    case 'payment_setup':
      errors.push('Payment setup is completed by platform administrators');
      break;
    case 'supplier_portal_access': {
      const checklist = stageData as {
        trainingCompleted?: boolean;
        poWorkflowUnderstood?: boolean;
        invoiceFlowUnderstood?: boolean;
      };
      if (!checklist.trainingCompleted) errors.push('Confirm training is completed');
      if (!checklist.poWorkflowUnderstood) errors.push('Confirm PO workflow understanding');
      if (!checklist.invoiceFlowUnderstood) errors.push('Confirm invoice flow understanding');
      break;
    }
    case 'supplier_activation':
      errors.push('Activation is completed by platform administrators');
      break;
    default:
      break;
  }

  if (errors.length > 0) {
    throw new StageValidationError('Stage requirements not met', errors);
  }
}

export async function validateAdminCanApproveStage(
  stage: SupplierOnboardingStageCode,
  supplierId: string,
  partnerId: string
): Promise<void> {
  if (stage === 'catalog_setup') {
    const pending = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(supplierProducts)
      .where(
        and(
          eq(supplierProducts.supplierId, supplierId),
          eq(supplierProducts.status, 'pending_approval')
        )
      );
    if (Number(pending[0]?.count ?? 0) > 0) {
      throw new StageValidationError('Approve or reject all pending catalog products first');
    }
  }
  if (stage === 'supplier_documentation') {
    const missing = await getMissingApprovedRequiredDocumentTypes(
      partnerId,
      SUPPLIER_REQUIRED_DOCUMENT_TYPES
    );
    if (missing.length > 0) {
      throw new StageValidationError(
        `Each required document type must have at least one approved file before this stage can be approved. Still needed: ${formatMissingDocumentTypes(missing)}`
      );
    }
  }
  if (stage === 'supplier_verification') {
    const missing = await getMissingApprovedRequiredDocumentTypes(
      partnerId,
      SUPPLIER_REQUIRED_DOCUMENT_TYPES
    );
    if (missing.length > 0) {
      throw new StageValidationError(
        `Cannot approve verification until all required documents are approved. Missing approval for: ${formatMissingDocumentTypes(missing)}`
      );
    }
  }
  if (stage === 'supplier_agreement') {
    const countersigned = await partnerHasCountersignedAgreement(partnerId);
    if (!countersigned) {
      throw new StageValidationError(
        'At least one agreement must be accepted (countersigned) by operations before this stage can be approved. Rejected agreements do not count.'
      );
    }
  }
  if (stage === 'supplier_activation') {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);
    if (!partner) throw new StageValidationError('Partner not found');
  }
}
