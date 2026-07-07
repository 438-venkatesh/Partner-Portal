import { apiClient } from './client';

export interface CommissionPlan {
  planId: string;
  name: string;
  partnerType: string | null;
  minTier: string | null;
  rateType: 'percentage' | 'flat' | 'tiered';
  rate: string | null;
  tieredRates: Array<{ minAmount: number; rate: number }>;
  isActive: boolean;
}

export interface CommissionRecord {
  recordId: string;
  partnerId: string;
  partnerName?: string;
  dealId: string | null;
  type: 'deal_commission' | 'spiff' | 'manual_adjustment';
  amount: string;
  currency: string;
  description: string | null;
  status: 'pending' | 'approved' | 'paid';
  createdAt: string;
}

export interface IncentiveChallenge {
  challengeId: string;
  name: string;
  description: string | null;
  metric: 'deals_won' | 'revenue';
  target: string;
  rewardType: 'points' | 'fixed_amount';
  rewardValue: string;
  partnerType: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  progress?: number;
  completed?: boolean;
}

export const commissionsApi = {
  listPlans: async () => {
    const { data } = await apiClient.get<{ plans: CommissionPlan[] }>('/commissions/plans');
    return data.plans;
  },
  createPlan: async (input: {
    name: string;
    rateType: string;
    rate?: number;
    partnerType?: string;
    minTier?: string;
    tieredRates?: Array<{ minAmount: number; rate: number }>;
  }) => {
    const { data } = await apiClient.post<{ plan: CommissionPlan }>('/commissions/plans', input);
    return data.plan;
  },
  updatePlan: async (planId: string, patch: Partial<CommissionPlan>) => {
    const { data } = await apiClient.patch<{ plan: CommissionPlan }>(`/commissions/plans/${planId}`, patch);
    return data.plan;
  },
  deletePlan: async (planId: string) => {
    await apiClient.delete(`/commissions/plans/${planId}`);
  },

  listRecords: async (status?: string) => {
    const { data } = await apiClient.get<{ records: CommissionRecord[] }>('/commissions/records', { params: { status } });
    return data.records;
  },
  adjust: async (partnerId: string, amount: number, description: string) => {
    const { data } = await apiClient.post<{ record: CommissionRecord }>(`/commissions/records/${partnerId}/adjust`, {
      amount,
      description,
    });
    return data.record;
  },
  approveRecord: async (recordId: string) => {
    await apiClient.post(`/commissions/records/${recordId}/approve`);
  },
  markPaid: async (recordIds: string[], reference: string) => {
    const { data } = await apiClient.post<{ records: CommissionRecord[] }>('/commissions/records/mark-paid', {
      recordIds,
      reference,
    });
    return data.records;
  },

  listChallenges: async () => {
    const { data } = await apiClient.get<{ challenges: IncentiveChallenge[] }>('/commissions/challenges');
    return data.challenges;
  },
  createChallenge: async (input: {
    name: string;
    metric: string;
    target: number;
    rewardType: string;
    rewardValue: number;
    startDate: string;
    endDate: string;
    partnerType?: string;
  }) => {
    const { data } = await apiClient.post<{ challenge: IncentiveChallenge }>('/commissions/challenges', input);
    return data.challenge;
  },
  deleteChallenge: async (challengeId: string) => {
    await apiClient.delete(`/commissions/challenges/${challengeId}`);
  },

  // Partner-facing
  getMine: async () => {
    const { data } = await apiClient.get<{ records: CommissionRecord[]; balance: number }>('/partner-commissions');
    return data;
  },
  getMyChallenges: async () => {
    const { data } = await apiClient.get<{ challenges: IncentiveChallenge[] }>('/partner-commissions/challenges');
    return data.challenges;
  },
};
