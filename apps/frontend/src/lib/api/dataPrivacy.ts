import { apiClient } from './client';
import { partnerApiClient } from './partnerClient';

export interface ErasureRequest {
  requestId: string;
  partnerId: string;
  requestedBy: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export const dataPrivacyApi = {
  // ---- admin ----
  listAllErasureRequests: async (status?: string) => {
    const { data } = await apiClient.get<{ requests: Array<{ request: ErasureRequest; partnerName: string | null }> }>(
      '/privacy/erasure-requests',
      { params: { status } }
    );
    return data.requests;
  },
  reviewErasureRequest: async (requestId: string, approved: boolean, rejectionReason?: string) => {
    const { data } = await apiClient.post<{ request: ErasureRequest }>(
      `/privacy/erasure-requests/${requestId}/review`,
      { approved, rejectionReason }
    );
    return data.request;
  },

  // ---- partner-facing ----
  exportMyData: async () => {
    const { data } = await partnerApiClient.get('/partner-privacy/export');
    return data;
  },
  listMyErasureRequests: async () => {
    const { data } = await partnerApiClient.get<{ requests: ErasureRequest[] }>('/partner-privacy/erasure-requests');
    return data.requests;
  },
  requestErasure: async (reason?: string) => {
    const { data } = await partnerApiClient.post<{ request: ErasureRequest }>('/partner-privacy/erasure-requests', {
      reason,
    });
    return data.request;
  },
};
