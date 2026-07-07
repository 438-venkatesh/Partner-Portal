import { apiClient } from './client';
import type { CreatePartnerInput, UpdatePartnerInput, PartnerResponse } from '@partner-portal/common';

export interface PartnerActivityLog {
  logId: string;
  partnerId: string;
  tenantId?: string | null;
  activityType: string;
  activityDescription: string;
  performedBy: string;
  performedByType: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface PartnerAgreement {
  agreementId: string;
  partnerId: string;
  tenantId?: string | null;
  relationshipId?: string | null;
  agreementType: string;
  agreementNumber: string;
  title: string;
  description?: string | null;
  documentUrl?: string | null;
  status: string;
  notes?: string | null;
  platformSignedAt?: string | null;
  signedByPlatform?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerAgreementInput {
  agreementType: string;
  agreementNumber: string;
  title: string;
  description?: string;
  tenantId?: string;
  documentUrl?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdatePartnerAgreementInput {
  agreementType?: string;
  agreementNumber?: string;
  title?: string;
  description?: string | null;
  tenantId?: string | null;
  documentUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  status?: 'draft' | 'pending_signature' | 'signed' | 'expired' | 'terminated' | 'cancelled';
}

export const partnerApi = {
  getAll: async (query?: any) => {
    const { data } = await apiClient.get<{ partners: PartnerResponse[]; pagination: any }>('/partners', { params: query });
    return data;
  },

  getById: async (partnerId: string) => {
    const { data } = await apiClient.get<PartnerResponse>(`/partners/${partnerId}`);
    return data;
  },

  create: async (input: CreatePartnerInput) => {
    const { data } = await apiClient.post<PartnerResponse>('/partners', input);
    return data;
  },

  update: async (partnerId: string, input: UpdatePartnerInput) => {
    const { data } = await apiClient.put<PartnerResponse>(`/partners/${partnerId}`, input);
    return data;
  },

  approve: async (partnerId: string, approved: boolean, notes?: string) => {
    await apiClient.post(`/partners/${partnerId}/approve`, { approved, notes });
  },

  getActivationReadiness: async (partnerId: string) => {
    const { data } = await apiClient.get<{ ready: boolean; blockers: string[] }>(
      `/partners/${partnerId}/activation-readiness`
    );
    return data;
  },

  suspend: async (partnerId: string) => {
    await apiClient.post(`/partners/${partnerId}/suspend`);
  },

  getActivity: async (partnerId: string) => {
    const { data } = await apiClient.get<{ activity: PartnerActivityLog[] }>(
      `/partners/${partnerId}/activity`
    );
    return data;
  },

  getAgreements: async (partnerId: string) => {
    const { data } = await apiClient.get<{ agreements: PartnerAgreement[] }>(
      `/partners/${partnerId}/agreements`
    );
    return data;
  },

  getPortalUsers: async (partnerId: string) => {
    const { data } = await apiClient.get<{
      employees: Array<{
        accountId: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
        phone?: string | null;
        status: string;
        emailVerified: boolean;
        role?: string | null;
        lastLoginAt?: string | null;
        createdAt: string;
      }>;
    }>(`/partners/${partnerId}/portal-users`);
    return data;
  },

  createAgreement: async (partnerId: string, input: CreatePartnerAgreementInput) => {
    const { data } = await apiClient.post<{ agreement: PartnerAgreement }>(
      `/partners/${partnerId}/agreements`,
      input
    );
    return data;
  },

  updateAgreement: async (
    partnerId: string,
    agreementId: string,
    input: UpdatePartnerAgreementInput
  ) => {
    const { data } = await apiClient.patch<{ agreement: PartnerAgreement }>(
      `/partners/${partnerId}/agreements/${agreementId}`,
      input
    );
    return data;
  },

  updateAgreementStatus: async (
    partnerId: string,
    agreementId: string,
    body: { status: 'cancelled' | 'terminated' | 'expired'; notes?: string }
  ) => {
    const { data } = await apiClient.patch<{ agreement: PartnerAgreement }>(
      `/partners/${partnerId}/agreements/${agreementId}/status`,
      body
    );
    return data;
  },

  deleteAgreement: async (partnerId: string, agreementId: string) => {
    await apiClient.delete(`/partners/${partnerId}/agreements/${agreementId}`);
  },
};

