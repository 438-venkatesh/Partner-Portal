import { apiClient } from './client';

export interface Service {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceCategory: string;
  description?: string;
  requiredDocuments?: string[];
  applications?: string[];
  defaultPermissions?: Record<string, any>;
  isActive: boolean;
}

export interface ServiceOffering {
  id: string;
  partnerId: string;
  serviceId: string;
  status: string;
  certificationLevel?: string;
  yearsExperience?: number;
  specializations?: string[];
  pricingModel?: string;
  rate?: number;
  currency?: string;
  service?: Service;
}

export interface ServiceRelationshipTenant {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  status: string;
}

export interface ServiceRelationship {
  relationshipId: string;
  partnerId: string;
  tenantId: string;
  tenant?: ServiceRelationshipTenant;
  serviceId: string;
  status: 'pending' | 'active' | 'suspended' | 'terminated' | 'expired';
  requestedBy: string;
  requestedByUser: string;
  requestedServices: string[];
  approvedServices?: string[];
  applications?: string[];
  modules?: Record<string, any>;
  permissions?: Record<string, any>;
  customPermissions?: Record<string, any>;
  startDate?: string;
  endDate?: string;
  gracePeriodDays?: number;
  terminationDate?: string;
  terminationReason?: string;
  approvalStatus?: Record<string, any>;
  approvedByTenantAdmin?: string;
  approvedByPartnerAdmin?: string;
  approvedByPlatformAdmin?: string;
  tenantApprovedAt?: string;
  partnerApprovedAt?: string;
  platformApprovedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  service?: Service;
}

export interface CreateRelationshipData {
  partnerId: string;
  tenantId: string;
  serviceId: string;
  requestedServices: string[];
  applications?: string[];
  modules?: Record<string, any>;
  permissions?: Record<string, any>;
  startDate?: string;
  notes?: string;
}

export interface UpdateRelationshipData {
  approvedServices?: string[];
  applications?: string[];
  modules?: Record<string, any>;
  permissions?: Record<string, any>;
  customPermissions?: Record<string, any>;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export const serviceApi = {
  async getServiceCatalog(): Promise<{ services: Service[] }> {
    const response = await apiClient.get('/services/catalog');
    return response.data;
  },

  async getPartnerOfferings(partnerId: string): Promise<{ offerings: ServiceOffering[] }> {
    const response = await apiClient.get(`/services/partners/${partnerId}/offerings`);
    return response.data;
  },

  async getPartnerRelationships(
    partnerId: string,
    query?: { tenantId?: string; status?: string }
  ): Promise<{ relationships: ServiceRelationship[] }> {
    const response = await apiClient.get(`/services/partners/${partnerId}/relationships`, {
      params: query,
    });
    return response.data;
  },

  async getRelationshipById(relationshipId: string): Promise<ServiceRelationship> {
    const response = await apiClient.get(`/services/relationships/${relationshipId}`);
    return response.data;
  },

  async createRelationship(data: CreateRelationshipData): Promise<ServiceRelationship> {
    const response = await apiClient.post('/services/relationships', data);
    return response.data;
  },

  async updateRelationship(
    relationshipId: string,
    data: UpdateRelationshipData
  ): Promise<ServiceRelationship> {
    const response = await apiClient.put(`/services/relationships/${relationshipId}`, data);
    return response.data;
  },

  async approveRelationship(
    relationshipId: string,
    data: {
      approvedBy: 'tenant_admin' | 'partner_admin' | 'platform_admin';
      approvedServices?: string[];
      notes?: string;
    }
  ): Promise<void> {
    await apiClient.post(`/services/relationships/${relationshipId}/approve`, data);
  },

  async terminateRelationship(
    relationshipId: string,
    data: { terminationReason: string; notes?: string }
  ): Promise<void> {
    await apiClient.post(`/services/relationships/${relationshipId}/terminate`, data);
  },
};









