import { partnerApiClient } from './partnerClient';
import type { OnboardingStage, OnboardingStatus, OnboardingWorkflow } from './onboarding';

export interface PartnerOnboardingWorkflowResponse {
  workflow: OnboardingWorkflow & {
    stages: Record<
      string,
      {
        status: OnboardingStatus;
        submittedForReview?: boolean;
        stageData?: Record<string, unknown>;
        notes?: string;
      }
    >;
  };
}

export const partnerOnboardingApi = {
  getWorkflow: async (): Promise<PartnerOnboardingWorkflowResponse> => {
    const { data } = await partnerApiClient.get('/partner-onboarding/workflow');
    return data;
  },

  submitStage: async (stage: OnboardingStage, payload?: Record<string, unknown>) => {
    const { data } = await partnerApiClient.post<{ workflow: OnboardingWorkflow }>(
      '/partner-onboarding/stage/submit',
      { stage, ...payload }
    );
    return data;
  },

  submitRegistration: async (payload: {
    acceptedTerms: true;
    displayName?: string;
    website?: string;
    description?: string;
  }) => {
    return partnerOnboardingApi.submitStage('registration', payload);
  },

  saveDraft: async (stage: OnboardingStage, payload?: Record<string, unknown>) => {
    const { data } = await partnerApiClient.put('/partner-onboarding/stage/draft', {
      stage,
      payload,
    });
    return data;
  },

  ensureAgreement: async () => {
    const { data } = await partnerApiClient.post<{ agreement: Record<string, unknown> }>(
      '/partner-onboarding/ensure-agreement'
    );
    return data;
  },
};
