import { apiClient } from './client';

export interface TierDefinition {
  tierCode: string;
  label: string;
  description: string | null;
  rank: number;
  badgeColor: string | null;
  benefits: string[];
  minTenureDays: number | null;
  minVerifiedDocuments: number | null;
  minRewardPoints: number | null;
  isActive: boolean;
}

export interface TierProgress {
  currentTier: TierDefinition | null;
  eligibleTier: TierDefinition | null;
  nextTier: TierDefinition | null;
  canAutoPromote: boolean;
  signals: { tenureDays: number; verifiedDocuments: number; rewardBalance: number };
}

export const tiersApi = {
  list: async () => {
    const { data } = await apiClient.get<{ tiers: TierDefinition[] }>('/partner-tiers');
    return data.tiers;
  },
  create: async (input: Omit<TierDefinition, 'benefits'> & { benefits?: string[] }) => {
    const { data } = await apiClient.post<{ tier: TierDefinition }>('/partner-tiers', input);
    return data.tier;
  },
  update: async (tierCode: string, patch: Partial<TierDefinition>) => {
    const { data } = await apiClient.patch<{ tier: TierDefinition }>(`/partner-tiers/${tierCode}`, patch);
    return data.tier;
  },
  remove: async (tierCode: string) => {
    await apiClient.delete(`/partner-tiers/${tierCode}`);
  },
  getProgress: async (partnerId: string) => {
    const { data } = await apiClient.get<TierProgress>(`/partners/${partnerId}/tier-progress`);
    return data;
  },
  setManually: async (partnerId: string, tierCode: string) => {
    await apiClient.put(`/partners/${partnerId}/tier`, { tierCode });
  },
};
