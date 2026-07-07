import { db } from '../db';
import { partnerTenantServiceRelationships } from '../db/schema/services';
import { partnerDocuments } from '../db/schema/documents';
import { partnerAgreements } from '../db/schema';
import { partnerUserAccounts } from '../db/schema/partnerAuth';
import { eq, and } from 'drizzle-orm';
import { PARTNER_REQUIRED_DOCUMENT_TYPES } from '@partner-portal/common';
import { partnerAuthService } from './partnerAuthService';
import type { OnboardingStage } from './onboardingService';
import {
  formatMissingDocumentTypes,
  getMissingApprovedRequiredDocumentTypes,
} from './documentReviewRequirements';

export class PartnerStageValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: string[]
  ) {
    super(message);
    this.name = 'PartnerStageValidationError';
  }
}

export async function validatePartnerStageCompletion(
  stage: OnboardingStage,
  partnerId: string,
  stageData: Record<string, unknown>
): Promise<void> {
  const errors: string[] = [];

  switch (stage) {
    case 'registration': {
      const org = await partnerAuthService.getOrganization(partnerId);
      if (!org?.partnerName?.trim()) errors.push('Company name is required');
      if (stageData.acceptedTerms !== true) errors.push('You must accept the partner terms and conditions');
      break;
    }
    case 'service_selection': {
      const relationships = await db
        .select()
        .from(partnerTenantServiceRelationships)
        .where(
          and(
            eq(partnerTenantServiceRelationships.partnerId, partnerId),
            eq(partnerTenantServiceRelationships.status, 'active')
          )
        );
      if (relationships.length === 0) {
        errors.push(
          'At least one active tenant service relationship is required. Operations must link a tenant and service, or confirm your service selections.'
        );
      }
      break;
    }
    case 'documentation': {
      const docs = await db
        .select({ documentType: partnerDocuments.documentType })
        .from(partnerDocuments)
        .where(eq(partnerDocuments.partnerId, partnerId));
      const types = new Set(docs.map((d) => d.documentType));
      for (const required of PARTNER_REQUIRED_DOCUMENT_TYPES) {
        if (!types.has(required)) {
          errors.push(`Missing document: ${required.replace(/_/g, ' ')}`);
        }
      }
      break;
    }
    case 'agreement': {
      const agreements = await db
        .select()
        .from(partnerAgreements)
        .where(
          and(eq(partnerAgreements.partnerId, partnerId), eq(partnerAgreements.status, 'signed'))
        );
      if (agreements.length === 0) {
        errors.push('Sign the partner agreement before submitting this stage');
      }
      break;
    }
    case 'user_setup': {
      const accounts = await db
        .select()
        .from(partnerUserAccounts)
        .where(eq(partnerUserAccounts.partnerId, partnerId));
      if (accounts.length < 1) {
        errors.push('Add at least one portal user under Employees');
      }
      break;
    }
    case 'training': {
      if (stageData.trainingCompleted !== true) {
        errors.push('Mark training as completed before submitting');
      }
      break;
    }
    case 'testing': {
      if (stageData.pilotCompleted !== true) {
        errors.push('Confirm pilot testing is complete before submitting');
      }
      break;
    }
    default:
      errors.push('This stage cannot be submitted from the partner portal');
  }

  if (errors.length > 0) {
    throw new PartnerStageValidationError(errors[0], errors);
  }
}

export async function validateAdminCanApprovePartnerStage(
  stage: OnboardingStage,
  partnerId: string
): Promise<void> {
  const errors: string[] = [];

  switch (stage) {
    case 'service_selection': {
      const relationships = await db
        .select()
        .from(partnerTenantServiceRelationships)
        .where(eq(partnerTenantServiceRelationships.partnerId, partnerId));
      if (relationships.length === 0) {
        errors.push('No tenant service relationships found for this partner');
      }
      break;
    }
    case 'documentation': {
      const missing = await getMissingApprovedRequiredDocumentTypes(
        partnerId,
        PARTNER_REQUIRED_DOCUMENT_TYPES
      );
      if (missing.length > 0) {
        errors.push(
          `Each required document type must have at least one approved file. Still needed: ${formatMissingDocumentTypes(missing)}`
        );
      }
      break;
    }
    case 'agreement': {
      const agreements = await db
        .select()
        .from(partnerAgreements)
        .where(
          and(eq(partnerAgreements.partnerId, partnerId), eq(partnerAgreements.status, 'signed'))
        );
      if (agreements.length === 0) {
        errors.push('Partner agreement must be signed before approval');
      }
      break;
    }
    default:
      break;
  }

  if (errors.length > 0) {
    throw new PartnerStageValidationError(errors[0], errors);
  }
}
