import { apiClient } from './client';

export interface StaffAccount {
  adminId: string;
  email: string;
  role: 'superadmin' | 'admin' | 'viewer';
  isActive: boolean;
  createdAt: string | null;
}

export interface PlatformAuditEntry {
  auditId: string;
  actorId: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string | null;
}

export interface CustomFieldDefinition {
  fieldId: string;
  entityType: string;
  fieldKey: string;
  label: string;
  fieldType: 'text' | 'number' | 'boolean' | 'date' | 'select';
  options: string[];
  isActive: boolean;
  sortOrder: number | null;
}

export interface AutoSuspendRule {
  ruleId: string;
  name: string;
  inactivityDays: number;
  autoSuspend: boolean;
  isActive: boolean;
}

export const adminAccountsApi = {
  listStaff: async () => {
    const { data } = await apiClient.get<{ staff: StaffAccount[] }>('/auth/staff');
    return data.staff;
  },
  register: async (body: { email: string; password: string; role: 'superadmin' | 'admin' | 'viewer' }) => {
    const { data } = await apiClient.post('/auth/register', body);
    return data;
  },
  updateRole: async (adminId: string, role: 'superadmin' | 'admin' | 'viewer') => {
    const { data } = await apiClient.put(`/auth/staff/${adminId}/role`, { role });
    return data;
  },
  setActive: async (adminId: string, isActive: boolean) => {
    const { data } = await apiClient.put(`/auth/staff/${adminId}/active`, { isActive });
    return data;
  },
};

export const platformAuditApi = {
  list: async (params?: { entityType?: string; limit?: number; offset?: number }) => {
    const { data } = await apiClient.get<{ entries: PlatformAuditEntry[] }>('/auth/audit-log', { params });
    return data.entries;
  },
};

export const customFieldsApi = {
  list: async (entityType = 'partner') => {
    const { data } = await apiClient.get<{ fields: CustomFieldDefinition[] }>('/admin-governance/custom-fields', {
      params: { entityType },
    });
    return data.fields;
  },
  create: async (body: {
    entityType?: string;
    fieldKey: string;
    label: string;
    fieldType: CustomFieldDefinition['fieldType'];
    options?: string[];
  }) => {
    const { data } = await apiClient.post('/admin-governance/custom-fields', body);
    return data;
  },
  update: async (fieldId: string, patch: Partial<{ label: string; options: string[]; isActive: boolean }>) => {
    const { data } = await apiClient.patch(`/admin-governance/custom-fields/${fieldId}`, patch);
    return data;
  },
  remove: async (fieldId: string) => {
    await apiClient.delete(`/admin-governance/custom-fields/${fieldId}`);
  },
  setPartnerValue: async (partnerId: string, fieldKey: string, value: unknown) => {
    const { data } = await apiClient.put(`/admin-governance/custom-fields/partners/${partnerId}/${fieldKey}`, {
      value,
    });
    return data;
  },
};

export const bulkAdminActionsApi = {
  bulkPartnerAction: async (body: {
    partnerIds: string[];
    action: 'approve' | 'suspend' | 'reactivate';
    reason?: string;
  }) => {
    const { data } = await apiClient.post('/admin-governance/bulk/partners', body);
    return data as { results: { partnerId: string; ok: boolean; message?: string }[] };
  },
  bulkVerifyDocuments: async (body: { documentIds: string[]; verified: boolean; notes?: string }) => {
    const { data } = await apiClient.post('/admin-governance/bulk/documents/verify', body);
    return data as { results: { documentId: string; ok: boolean; message?: string }[] };
  },
};

export const autoSuspendRulesApi = {
  list: async () => {
    const { data } = await apiClient.get<{ rules: AutoSuspendRule[] }>('/admin-governance/auto-suspend-rules');
    return data.rules;
  },
  create: async (body: { name: string; inactivityDays?: number; autoSuspend?: boolean }) => {
    const { data } = await apiClient.post('/admin-governance/auto-suspend-rules', body);
    return data;
  },
  update: async (ruleId: string, patch: Partial<{ name: string; inactivityDays: number; autoSuspend: boolean; isActive: boolean }>) => {
    const { data } = await apiClient.patch(`/admin-governance/auto-suspend-rules/${ruleId}`, patch);
    return data;
  },
  remove: async (ruleId: string) => {
    await apiClient.delete(`/admin-governance/auto-suspend-rules/${ruleId}`);
  },
  run: async () => {
    const { data } = await apiClient.post('/admin-governance/auto-suspend-rules/run', {});
    return data as { flagged: { partnerId: string; partnerName: string; daysInactive: number }[]; suspended: string[] };
  },
};
