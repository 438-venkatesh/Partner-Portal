import { apiClient } from './client';

export interface Lead {
  leadId: string;
  customerName: string;
  contactEmail: string | null;
  contactPhone?: string | null;
  assignedPartnerId: string | null;
  partnerName?: string | null;
  status: 'new' | 'assigned' | 'accepted' | 'rejected' | 'converted' | 'expired';
  createdAt: string;
}

export interface LeadRoutingRule {
  ruleId: string;
  name: string;
  partnerType: string | null;
  minTier: string | null;
  tags: string[];
  isActive: boolean;
}

export const leadsApi = {
  listAll: async () => {
    const { data } = await apiClient.get<{ leads: Lead[] }>('/leads');
    return data.leads;
  },
  create: async (input: { customerName: string; contactEmail?: string; contactPhone?: string; notes?: string }) => {
    const { data } = await apiClient.post<{ lead: Lead }>('/leads', input);
    return data.lead;
  },
  listRoutingRules: async () => {
    const { data } = await apiClient.get<{ rules: LeadRoutingRule[] }>('/leads/routing-rules');
    return data.rules;
  },
  createRoutingRule: async (input: { name: string; partnerType?: string; minTier?: string; tags?: string[] }) => {
    const { data } = await apiClient.post<{ rule: LeadRoutingRule }>('/leads/routing-rules', input);
    return data.rule;
  },
  updateRoutingRule: async (ruleId: string, patch: Partial<LeadRoutingRule>) => {
    const { data } = await apiClient.patch<{ rule: LeadRoutingRule }>(`/leads/routing-rules/${ruleId}`, patch);
    return data.rule;
  },
  deleteRoutingRule: async (ruleId: string) => {
    await apiClient.delete(`/leads/routing-rules/${ruleId}`);
  },

  // Partner-facing
  listMine: async () => {
    const { data } = await apiClient.get<{ leads: Lead[] }>('/partner-leads');
    return data.leads;
  },
  respond: async (leadId: string, accepted: boolean) => {
    const { data } = await apiClient.post<{ lead: Lead }>(`/partner-leads/${leadId}/respond`, { accepted });
    return data.lead;
  },
};
