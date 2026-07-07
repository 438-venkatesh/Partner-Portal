import { apiClient } from './client';

export interface BusinessPlan {
  planId: string;
  partnerId: string;
  title: string;
  description: string | null;
  targetMetric: string | null;
  targetValue: string | null;
  currentValue: string | null;
  targetDate: string | null;
  status: 'draft' | 'active' | 'completed' | 'missed';
  createdAt: string;
}

export interface RewardTransaction {
  id: string;
  partnerId: string;
  points: number;
  reason: string;
  createdAt: string;
}

export interface HealthScore {
  partnerId: string;
  score: number;
  band: 'healthy' | 'at_risk' | 'critical';
  factors: Array<{ label: string; weight: number; earned: number; detail: string }>;
}

export interface AccountMapTenant {
  tenantId: string;
  tenantName: string | null;
  status: string | null;
  sharedWith: Array<{ partnerId: string; partnerName: string | null; status: string | null }>;
}

export interface StaffUser {
  adminId: string;
  email: string;
  role: string;
}

export const relationshipApi = {
  getBusinessPlans: async (partnerId: string) => {
    const { data } = await apiClient.get<{ plans: BusinessPlan[] }>(`/partners/${partnerId}/business-plans`);
    return data.plans;
  },
  createBusinessPlan: async (
    partnerId: string,
    input: { title: string; description?: string; targetMetric?: string; targetValue?: number; targetDate?: string }
  ) => {
    const { data } = await apiClient.post<{ plan: BusinessPlan }>(`/partners/${partnerId}/business-plans`, input);
    return data.plan;
  },
  updateBusinessPlan: async (
    partnerId: string,
    planId: string,
    patch: {
      title?: string;
      description?: string;
      targetMetric?: string;
      targetValue?: number;
      currentValue?: number;
      targetDate?: string;
      status?: BusinessPlan['status'];
    }
  ) => {
    const { data } = await apiClient.patch<{ plan: BusinessPlan }>(
      `/partners/${partnerId}/business-plans/${planId}`,
      patch
    );
    return data.plan;
  },
  deleteBusinessPlan: async (partnerId: string, planId: string) => {
    await apiClient.delete(`/partners/${partnerId}/business-plans/${planId}`);
  },

  getRewards: async (partnerId: string) => {
    const { data } = await apiClient.get<{ balance: number; transactions: RewardTransaction[] }>(
      `/partners/${partnerId}/rewards`
    );
    return data;
  },
  awardPoints: async (partnerId: string, input: { points: number; reason: string }) => {
    await apiClient.post(`/partners/${partnerId}/rewards/award`, input);
  },

  getHealthScore: async (partnerId: string) => {
    const { data } = await apiClient.get<HealthScore>(`/partners/${partnerId}/health-score`);
    return data;
  },
  listHealthScores: async () => {
    const { data } = await apiClient.get<{
      scores: Array<{ partnerId: string; partnerName: string; score: number; band: string }>;
    }>('/partners/health-scores');
    return data.scores;
  },

  getAccountMap: async (partnerId: string) => {
    const { data } = await apiClient.get<{ tenants: AccountMapTenant[] }>(`/partners/${partnerId}/account-map`);
    return data.tenants;
  },
  getOverlaps: async () => {
    const { data } = await apiClient.get<{
      overlaps: Array<{
        tenantId: string;
        tenantName: string | null;
        partners: Array<{ partnerId: string; partnerName: string | null; status: string | null }>;
      }>;
    }>('/account-mapping/overlaps');
    return data.overlaps;
  },

  updateTags: async (partnerId: string, tags: string[]) => {
    await apiClient.put(`/partners/${partnerId}/tags`, { tags });
  },
  assignAccountManager: async (partnerId: string, accountManagerId: string | null) => {
    await apiClient.put(`/partners/${partnerId}/account-manager`, { accountManagerId });
  },
  listStaff: async () => {
    const { data } = await apiClient.get<{ users: StaffUser[] }>('/auth/users');
    return data.users;
  },
};
