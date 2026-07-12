import { apiClient } from './client';

export interface AnalyticsOverview {
  periodDays: number;
  partners: { total: number; byStatus: Record<string, number>; byTier: Record<string, number> };
  dealFunnel: Record<string, number>;
  revenue: { total: number; leaderboard: Array<{ partnerId: string; partnerName: string; revenue: number }> };
  commissions: Record<string, number>;
  mdf: { totalSpent: number; requestCount: number };
}

export interface MdfRoiSummary {
  totalSpent: number;
  totalRevenue: number;
  roi: number | null;
  funds: Array<{
    fundId: string;
    name: string;
    totalSpent: number;
    revenue: number;
    roi: number | null;
    dealsLinked: number;
    dealsWon: number;
  }>;
}

export const adminAnalyticsApi = {
  getOverview: async (periodDays?: number) => {
    const { data } = await apiClient.get<AnalyticsOverview>('/admin-analytics/overview', { params: { periodDays } });
    return data;
  },
  getMdfRoiSummary: async () => {
    const { data } = await apiClient.get<MdfRoiSummary>('/admin-analytics/mdf-roi');
    return data;
  },
};
