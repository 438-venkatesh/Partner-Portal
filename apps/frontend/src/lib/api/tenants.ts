import { apiClient } from './client';

export interface TenantDto {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  industry: string | null;
  status: string;
  contactEmail: string | null;
  createdAt: string | null;
}

export interface CreateTenantInput {
  tenantCode: string;
  tenantName: string;
  industry?: string;
  contactEmail?: string;
}

export interface UpdateTenantInput {
  tenantName?: string;
  industry?: string;
  contactEmail?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export const tenantsApi = {
  list: async () => {
    const res = await apiClient.get<{ tenants: TenantDto[] }>('/tenants');
    return res.data;
  },

  get: async (tenantId: string) => {
    const res = await apiClient.get<{ tenant: TenantDto }>(`/tenants/${tenantId}`);
    return res.data;
  },

  create: async (body: CreateTenantInput) => {
    const res = await apiClient.post<{ tenant: TenantDto }>('/tenants', body);
    return res.data;
  },

  update: async (tenantId: string, body: UpdateTenantInput) => {
    const res = await apiClient.put<{ tenant: TenantDto }>(`/tenants/${tenantId}`, body);
    return res.data;
  },
};
