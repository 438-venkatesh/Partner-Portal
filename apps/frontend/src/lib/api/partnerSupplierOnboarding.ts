import { partnerApiClient } from './partnerClient';
import type { SupplierOnboardingStage, OnboardingStatus } from './onboarding';

export interface SupplierOnboardingWorkflowResponse {
  workflow: {
    workflowId: string;
    supplierId: string;
    currentStage: SupplierOnboardingStage;
    overallStatus: OnboardingStatus;
    stages: Record<
      string,
      {
        status: OnboardingStatus;
        submittedForReview?: boolean;
        stageData?: Record<string, unknown>;
        notes?: string;
      }
    >;
    completedStages: string[];
    notes?: string;
  };
  supplier: Record<string, unknown>;
  supplierId: string;
}

export const partnerSupplierOnboardingApi = {
  getWorkflow: async (): Promise<SupplierOnboardingWorkflowResponse> => {
    const { data } = await partnerApiClient.get('/partner-supplier-onboarding/workflow');
    return data;
  },

  ensureAgreement: async () => {
    const { data } = await partnerApiClient.post<{ agreement: Record<string, unknown> }>(
      '/partner-supplier-onboarding/ensure-agreement'
    );
    return data;
  },

  updateProfile: async (payload: {
    supplierCategory?: string;
    supplyRegions?: string[];
    leadTimeDays?: number;
    minimumOrderQuantity?: number;
    productCatalogUrl?: string;
    acceptedTerms?: boolean;
  }) => {
    const { data } = await partnerApiClient.patch('/partner-supplier-onboarding/profile', payload);
    return data;
  },

  saveDraft: async (stage: SupplierOnboardingStage, payload?: Record<string, unknown>) => {
    const { data } = await partnerApiClient.put('/partner-supplier-onboarding/stage/draft', {
      stage,
      payload,
    });
    return data;
  },

  submitStage: async (stage: SupplierOnboardingStage) => {
    const { data } = await partnerApiClient.post('/partner-supplier-onboarding/stage/submit', { stage });
    return data;
  },

  savePortalChecklist: async (payload: {
    trainingCompleted: boolean;
    poWorkflowUnderstood: boolean;
    invoiceFlowUnderstood: boolean;
    notes?: string;
  }) => {
    const { data } = await partnerApiClient.put(
      '/partner-supplier-onboarding/stage/supplier_portal_access/checklist',
      payload
    );
    return data;
  },
};
