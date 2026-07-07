import { apiClient } from './client';

export interface MdfFund {
  fundId: string;
  name: string;
  totalBudget: string;
  remainingBudget: string;
  fiscalPeriod: string | null;
  isActive: boolean;
}

export interface MdfRequest {
  requestId: string;
  partnerId: string;
  partnerName?: string;
  fundId: string;
  fundName?: string;
  campaignName: string;
  requestedAmount: string;
  approvedAmount: string | null;
  status: 'submitted' | 'approved' | 'rejected' | 'claimed' | 'paid';
  createdAt: string;
}

export const mdfApi = {
  listFunds: async () => {
    const { data } = await apiClient.get<{ funds: MdfFund[] }>('/mdf/funds');
    return data.funds;
  },
  createFund: async (input: { name: string; totalBudget: number; fiscalPeriod?: string }) => {
    const { data } = await apiClient.post<{ fund: MdfFund }>('/mdf/funds', input);
    return data.fund;
  },
  getFundRoi: async (fundId: string) => {
    const { data } = await apiClient.get<{ totalSpent: number; revenue: number; roi: number | null; dealsLinked: number; dealsWon: number }>(
      `/mdf/funds/${fundId}/roi`
    );
    return data;
  },
  listRequests: async (status?: string) => {
    const { data } = await apiClient.get<{ requests: MdfRequest[] }>('/mdf/requests', { params: { status } });
    return data.requests;
  },
  review: async (requestId: string, approved: boolean, approvedAmount?: number, rejectionReason?: string) => {
    const { data } = await apiClient.post<{ request: MdfRequest }>(`/mdf/requests/${requestId}/review`, {
      approved,
      approvedAmount,
      rejectionReason,
    });
    return data.request;
  },
  markPaid: async (requestId: string) => {
    const { data } = await apiClient.post<{ request: MdfRequest }>(`/mdf/requests/${requestId}/mark-paid`);
    return data.request;
  },

  // Partner-facing
  listFundsMine: async () => {
    const { data } = await apiClient.get<{ funds: MdfFund[] }>('/partner-mdf/funds');
    return data.funds;
  },
  listRequestsMine: async () => {
    const { data } = await apiClient.get<{ requests: MdfRequest[] }>('/partner-mdf/requests');
    return data.requests;
  },
  submitRequest: async (input: { fundId: string; campaignName: string; description?: string; requestedAmount: number }) => {
    const { data } = await apiClient.post<{ request: MdfRequest }>('/partner-mdf/requests', input);
    return data.request;
  },
  claim: async (requestId: string, proofOfExpenseUrl?: string) => {
    const { data } = await apiClient.post<{ request: MdfRequest }>(`/partner-mdf/requests/${requestId}/claim`, {
      proofOfExpenseUrl,
    });
    return data.request;
  },
};
