import { partnerApiClient } from './partnerClient';
import { normalizePartnerOnboardingResponse } from '@/lib/normalizePartnerOnboarding';

export interface TenantAccess {
  tenantId: string;
  tenantName?: string | null;
  tenantCode?: string | null;
  relationships: ServiceRelationship[];
  serviceCount: number;
  firstServiceDate?: string;
}

export interface ServiceRelationship {
  relationshipId: string;
  tenantId: string;
  serviceId: string;
  status: string;
  startDate?: string;
  endDate?: string;
  requestedServices: string[];
  approvedServices?: string[];
  createdAt: string;
  /** Joined from partner_services (tenant list API) */
  serviceName?: string | null;
  serviceCode?: string | null;
}

export interface ServiceTimeline {
  timelineId: string;
  relationshipId: string;
  partnerId: string;
  tenantId: string;
  serviceId: string;
  serviceType: string;
  title: string;
  description?: string;
  dueDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recurrenceType?: string;
  recurrenceInterval?: string;
  nextDueDate?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  activeClients: number;
  totalRelationships: number;
  upcomingDueDates: number;
  overdueItems: number;
  upcomingTimelines: ServiceTimeline[];
  overdueTimelines: ServiceTimeline[];
}

export interface PartnerDashboardRelationship {
  relationshipId: string;
  tenantId: string;
  serviceId: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  requestedServices: unknown;
  approvedServices?: unknown;
  createdAt: string;
  tenantName: string | null;
  tenantCode: string | null;
  serviceName: string;
  serviceCode: string;
}

export interface PartnerOnboardingStage {
  status: string;
  completedAt?: string;
  notes?: string;
  stageData?: Record<string, unknown>;
}

export interface PartnerOnboardingWorkflow {
  workflowId: string;
  partnerId?: string;
  supplierId?: string;
  logisticsId?: string;
  currentStage: string;
  overallStatus: string;
  stages: Record<string, PartnerOnboardingStage>;
  completedStages: string[];
  blockedStages?: string[];
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  partnerType?: string;
  stageOrder?: string[];
  flowTitle?: string;
  flowDescription?: string;
}

/** Matches Operations portal: workflow(s) depend on partner type. */
export interface PartnerOnboardingResponse {
  partnerType: string;
  service?: PartnerOnboardingWorkflow | null;
  supplier?: PartnerOnboardingWorkflow | null;
  logistics?: PartnerOnboardingWorkflow | null;
}

export interface CreateTimelineData {
  relationshipId: string;
  tenantId: string;
  serviceId: string;
  serviceType: string;
  title: string;
  description?: string;
  dueDate: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  recurrenceType?: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  recurrenceInterval?: string;
  assignedTo?: string;
  notes?: string;
}

export const partnerDashboardApi = {
  getOnboarding: async (): Promise<PartnerOnboardingResponse> => {
    const response = await partnerApiClient.get('/partner-dashboard/onboarding');
    return normalizePartnerOnboardingResponse(response.data);
  },

  getTenants: async (): Promise<{ tenants: TenantAccess[] }> => {
    const response = await partnerApiClient.get('/partner-dashboard/tenants');
    return response.data;
  },

  getRelationships: async (): Promise<{ relationships: PartnerDashboardRelationship[] }> => {
    const response = await partnerApiClient.get('/partner-dashboard/relationships');
    return response.data;
  },

  getStats: async (): Promise<DashboardStats> => {
    const response = await partnerApiClient.get<DashboardStats>('/partner-dashboard/stats');
    return response.data;
  },

  getTimelines: async (filters?: {
    tenantId?: string;
    status?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
  }): Promise<{ timelines: ServiceTimeline[] }> => {
    const params = new URLSearchParams();
    if (filters?.tenantId) params.append('tenantId', filters.tenantId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
    if (filters?.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
    
    const queryString = params.toString();
    const url = `/partner-dashboard/timelines${queryString ? `?${queryString}` : ''}`;
    const response = await partnerApiClient.get(url);
    return response.data;
  },

  getTenantDetail: async (tenantId: string) => {
    const response = await partnerApiClient.get(`/partner-dashboard/tenants/${tenantId}`);
    return response.data;
  },

  createTimeline: async (data: CreateTimelineData): Promise<ServiceTimeline> => {
    const response = await partnerApiClient.post<ServiceTimeline>('/partner-dashboard/timelines', data);
    return response.data;
  },

  updateTimeline: async (timelineId: string, data: {
    title?: string;
    description?: string;
    dueDate?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: string;
    notes?: string;
    completedDate?: string;
  }): Promise<ServiceTimeline> => {
    const response = await partnerApiClient.put<ServiceTimeline>(
      `/partner-dashboard/timelines/${timelineId}`,
      data
    );
    return response.data;
  },

  updateTimelineStatus: async (
    timelineId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled',
    completedDate?: string
  ): Promise<ServiceTimeline> => {
    const response = await partnerApiClient.put<ServiceTimeline>(
      `/partner-dashboard/timelines/${timelineId}/status`,
      { status, completedDate }
    );
    return response.data;
  },
};

