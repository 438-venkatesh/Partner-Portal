import { apiClient } from './client';

export type OnboardingStage =
  | 'registration'
  | 'service_selection'
  | 'initial_review'
  | 'documentation'
  | 'verification'
  | 'agreement'
  | 'app_access'
  | 'user_setup'
  | 'training'
  | 'testing'
  | 'go_live';

export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

export interface OnboardingWorkflow {
  workflowId: string;
  partnerId: string;
  currentStage: OnboardingStage;
  overallStatus: OnboardingStatus;
  stages: Record<string, {
    status: OnboardingStatus;
    completedAt?: string;
    notes?: string;
    stageData?: Record<string, any>;
  }>;
  completedStages: string[];
  blockedStages: string[];
  startedAt: string;
  completedAt?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  /** Present for service partners — stages that apply to this partner type. */
  partnerType?: string;
  stageOrder?: OnboardingStage[];
  flowTitle?: string;
  flowDescription?: string;
}

export interface UpdateStageData {
  stage: OnboardingStage;
  status: OnboardingStatus;
  stageData?: Record<string, any>;
  notes?: string;
}

export type SupplierOnboardingStage =
  | 'supplier_registration'
  | 'catalog_setup'
  | 'supplier_documentation'
  | 'supplier_verification'
  | 'supplier_agreement'
  | 'payment_setup'
  | 'supplier_portal_access'
  | 'supplier_activation';

export type LogisticsOnboardingStage =
  | 'logistics_registration'
  | 'fleet_setup'
  | 'logistics_documentation'
  | 'logistics_verification'
  | 'logistics_agreement'
  | 'api_integration'
  | 'logistics_portal_access'
  | 'logistics_testing'
  | 'logistics_activation';

export interface SupplierOnboardingWorkflow {
  workflowId: string;
  supplierId: string;
  currentStage: SupplierOnboardingStage;
  overallStatus: OnboardingStatus;
  stages: Record<string, {
    status: OnboardingStatus;
    completedAt?: string;
    notes?: string;
    stageData?: Record<string, any>;
  }>;
  completedStages: string[];
  blockedStages: string[];
  startedAt: string;
  completedAt?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogisticsOnboardingWorkflow {
  workflowId: string;
  logisticsId: string;
  currentStage: LogisticsOnboardingStage;
  overallStatus: OnboardingStatus;
  stages: Record<string, {
    status: OnboardingStatus;
    completedAt?: string;
    notes?: string;
    stageData?: Record<string, any>;
  }>;
  completedStages: string[];
  blockedStages: string[];
  startedAt: string;
  completedAt?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const onboardingApi = {
  async getWorkflow(partnerId: string): Promise<OnboardingWorkflow> {
    const response = await apiClient.get(`/onboarding/partner/${partnerId}`);
    return response.data;
  },

  async updateStage(partnerId: string, data: UpdateStageData): Promise<OnboardingWorkflow> {
    const response = await apiClient.put(`/onboarding/partner/${partnerId}/stage`, data);
    return response.data;
  },

  // Supplier onboarding
  async getSupplierWorkflow(supplierId: string): Promise<SupplierOnboardingWorkflow> {
    const response = await apiClient.get(`/onboarding/supplier/${supplierId}`);
    return response.data;
  },

  async updateSupplierStage(supplierId: string, data: {
    stage: SupplierOnboardingStage;
    status: OnboardingStatus;
    stageData?: Record<string, any>;
    notes?: string;
  }): Promise<SupplierOnboardingWorkflow> {
    const response = await apiClient.put(`/onboarding/supplier/${supplierId}/stage`, data);
    return response.data;
  },

  // Logistics onboarding
  async getLogisticsWorkflow(logisticsId: string): Promise<LogisticsOnboardingWorkflow> {
    const response = await apiClient.get(`/onboarding/logistics/${logisticsId}`);
    return response.data;
  },

  async updateLogisticsStage(logisticsId: string, data: {
    stage: LogisticsOnboardingStage;
    status: OnboardingStatus;
    stageData?: Record<string, any>;
    notes?: string;
  }): Promise<LogisticsOnboardingWorkflow> {
    const response = await apiClient.put(`/onboarding/logistics/${logisticsId}/stage`, data);
    return response.data;
  },

  async approveSupplierStage(
    supplierId: string,
    stage: SupplierOnboardingStage,
    body?: { notes?: string; stageData?: Record<string, unknown> }
  ): Promise<SupplierOnboardingWorkflow> {
    const response = await apiClient.post(
      `/onboarding/supplier/${supplierId}/stage/${stage}/approve`,
      body ?? {}
    );
    return response.data;
  },

  async rejectSupplierStage(
    supplierId: string,
    stage: SupplierOnboardingStage,
    reason: string
  ): Promise<SupplierOnboardingWorkflow> {
    const response = await apiClient.post(
      `/onboarding/supplier/${supplierId}/stage/${stage}/reject`,
      { reason }
    );
    return response.data;
  },

  async approveAllCatalogProducts(supplierId: string) {
    const response = await apiClient.post(`/onboarding/supplier/${supplierId}/catalog/approve-all`);
    return response.data as { approved: number };
  },

  async createSupplierAgreement(
    supplierId: string,
    body: { agreementName: string; agreementType?: string; documentUrl?: string }
  ) {
    const response = await apiClient.post(`/onboarding/supplier/${supplierId}/agreement`, body);
    return response.data;
  },

  async countersignSupplierAgreement(supplierId: string, agreementId: string) {
    const response = await apiClient.post(
      `/onboarding/supplier/${supplierId}/agreement/${agreementId}/countersign`
    );
    return response.data;
  },

  async getSupplierReviewQueue() {
    const response = await apiClient.get('/onboarding/supplier/review-queue');
    return response.data as {
      queue: Array<{
        supplierId: string;
        partnerId: string;
        partnerName: string;
        partnerType?: string;
        stage: string;
        submittedAt?: string;
        awaitingOpsReview?: boolean;
      }>;
    };
  },

  async getPartnerReviewQueue() {
    const response = await apiClient.get('/onboarding/partner/review-queue');
    return response.data as {
      queue: Array<{
        partnerId: string;
        partnerName: string;
        partnerType: string;
        stage: string;
        submittedAt?: string;
        awaitingOpsReview?: boolean;
      }>;
    };
  },

  async approvePartnerStage(
    partnerId: string,
    stage: OnboardingStage,
    body?: { notes?: string; stageData?: Record<string, unknown> }
  ): Promise<OnboardingWorkflow> {
    const response = await apiClient.post(
      `/onboarding/partner/${partnerId}/stage/${stage}/approve`,
      body ?? {}
    );
    return response.data;
  },

  async rejectPartnerStage(
    partnerId: string,
    stage: OnboardingStage,
    reason: string
  ): Promise<OnboardingWorkflow> {
    const response = await apiClient.post(
      `/onboarding/partner/${partnerId}/stage/${stage}/reject`,
      { reason }
    );
    return response.data;
  },
};


