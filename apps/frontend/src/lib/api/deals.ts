import { apiClient } from './client';

export interface Deal {
  dealId: string;
  partnerId: string;
  partnerName?: string;
  tenantId: string | null;
  customerName: string;
  dealName: string;
  estimatedValue: string | null;
  actualValue?: string | null;
  currency: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'won' | 'lost' | 'expired';
  protectionExpiresAt: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface RegisterDealInput {
  tenantId?: string;
  customerName: string;
  dealName: string;
  estimatedValue?: number;
  currency?: string;
  expectedCloseDate?: string;
  notes?: string;
}

export const dealsApi = {
  listAll: async (status?: string) => {
    const { data } = await apiClient.get<{ deals: Deal[] }>('/deals', { params: { status } });
    return data.deals;
  },
  registerOnBehalf: async (partnerId: string, input: RegisterDealInput) => {
    const { data } = await apiClient.post<{ deal: Deal; conflicts: Deal[] }>(`/deals/on-behalf/${partnerId}`, input);
    return data;
  },
  review: async (dealId: string, approved: boolean, rejectionReason?: string) => {
    const { data } = await apiClient.post<{ deal: Deal }>(`/deals/${dealId}/review`, { approved, rejectionReason });
    return data.deal;
  },
  resolve: async (dealId: string, outcome: 'won' | 'lost', actualValue?: number) => {
    const { data } = await apiClient.post<{ deal: Deal }>(`/deals/${dealId}/resolve`, { outcome, actualValue });
    return data.deal;
  },

  // Partner-facing
  listMine: async () => {
    const { data } = await apiClient.get<{ deals: Deal[] }>('/partner-deals');
    return data.deals;
  },
  register: async (input: RegisterDealInput) => {
    const { data } = await apiClient.post<{ deal: Deal; conflicts: Deal[] }>('/partner-deals', input);
    return data;
  },
};
