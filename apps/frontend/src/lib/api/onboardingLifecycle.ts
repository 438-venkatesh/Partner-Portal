import { apiClient } from './client';

export interface StageConfigRow {
  stageCode: string;
  label: string;
  description: string;
  isEnabled: boolean;
  isEnabledByDefault: boolean;
  sortOrder: number;
  hasCustomLabel: boolean;
  hasCustomOrder: boolean;
}

export interface AutoApprovalRule {
  ruleId: string;
  name: string;
  partnerType: string | null;
  minTier: string | null;
  requireDocumentsVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingAnalytics {
  totalPartnersInOnboarding: number;
  totalInProgress: number;
  totalCompleted: number;
  averageDaysToComplete: number | null;
  stalledCount: number;
  stalledAfterDays: number;
  byStage: Record<string, number>;
  byPartnerType: Record<string, { total: number; completed: number }>;
  stalledPartners: Array<{
    partnerId: string;
    partnerName: string | null;
    partnerType: string | null;
    currentStage: string;
    daysSinceLastActivity: number;
  }>;
}

export const onboardingLifecycleApi = {
  getStageConfig: async (partnerType: string) => {
    const { data } = await apiClient.get<{ stages: StageConfigRow[] }>(
      `/onboarding/stage-config/${partnerType}`
    );
    return data.stages;
  },

  updateStageConfig: async (
    partnerType: string,
    stageCode: string,
    patch: { label?: string; description?: string; isEnabled?: boolean; sortOrder?: number }
  ) => {
    const { data } = await apiClient.put(`/onboarding/stage-config/${partnerType}/${stageCode}`, patch);
    return data;
  },

  getAutoApprovalRules: async () => {
    const { data } = await apiClient.get<{ rules: AutoApprovalRule[] }>('/onboarding/auto-approval-rules');
    return data.rules;
  },

  createAutoApprovalRule: async (input: {
    name: string;
    partnerType?: string;
    minTier?: string;
    requireDocumentsVerified?: boolean;
    isActive?: boolean;
  }) => {
    const { data } = await apiClient.post<{ rule: AutoApprovalRule }>('/onboarding/auto-approval-rules', input);
    return data.rule;
  },

  updateAutoApprovalRule: async (ruleId: string, patch: Partial<AutoApprovalRule>) => {
    const { data } = await apiClient.patch<{ rule: AutoApprovalRule }>(
      `/onboarding/auto-approval-rules/${ruleId}`,
      patch
    );
    return data.rule;
  },

  deleteAutoApprovalRule: async (ruleId: string) => {
    await apiClient.delete(`/onboarding/auto-approval-rules/${ruleId}`);
  },

  getAnalytics: async () => {
    const { data } = await apiClient.get<OnboardingAnalytics>('/onboarding/analytics');
    return data;
  },
};
