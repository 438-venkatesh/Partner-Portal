import { apiClient } from './client';

export interface PerformanceMetrics {
  partnerId?: string;
  supplierId?: string;
  logisticsId?: string;
  period: string;
  revenue?: {
    total: number;
    currency: string;
    breakdown: Array<{ period: string; amount: number }>;
  };
  transactions: number;
  successRate: number;
  averageResponseTime?: number;
  customerSatisfaction?: number;
  slaCompliance?: number;
  issuesCount: number;
  resolvedIssuesCount: number;
  metrics: Record<string, any>;
}

export interface PerformanceQuery {
  tenantId?: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export const performanceApi = {
  async getPartnerMetrics(partnerId: string, query: PerformanceQuery): Promise<PerformanceMetrics> {
    const response = await apiClient.get(`/performance/partner/${partnerId}`, {
      params: {
        ...query,
        periodStart: query.periodStart instanceof Date ? query.periodStart.toISOString() : query.periodStart,
        periodEnd: query.periodEnd instanceof Date ? query.periodEnd.toISOString() : query.periodEnd,
      },
    });
    return response.data;
  },

  async getSupplierMetrics(supplierId: string, query: PerformanceQuery): Promise<PerformanceMetrics> {
    const response = await apiClient.get(`/performance/supplier/${supplierId}`, {
      params: {
        ...query,
        periodStart: query.periodStart instanceof Date ? query.periodStart.toISOString() : query.periodStart,
        periodEnd: query.periodEnd instanceof Date ? query.periodEnd.toISOString() : query.periodEnd,
      },
    });
    return response.data;
  },

  async getLogisticsMetrics(logisticsId: string, query: PerformanceQuery): Promise<PerformanceMetrics> {
    const response = await apiClient.get(`/performance/logistics/${logisticsId}`, {
      params: {
        ...query,
        periodStart: query.periodStart instanceof Date ? query.periodStart.toISOString() : query.periodStart,
        periodEnd: query.periodEnd instanceof Date ? query.periodEnd.toISOString() : query.periodEnd,
      },
    });
    return response.data;
  },
};


