import { apiClient } from './client';

export interface BillingPlan {
  planId: string;
  planName: string;
  priceCents: number;
  currency: string;
  features?: unknown;
  createdAt?: string | null;
}

export interface PartnerSubscription {
  subscriptionId: string;
  partnerId: string;
  planId: string;
  status: string;
  billingCycle: string;
  nextBillingDate?: string | null;
  createdAt?: string | null;
}

export const billingAdminApi = {
  listPlans: async () => {
    const { data } = await apiClient.get<{ plans: BillingPlan[] }>('/billing/plans');
    return data;
  },

  assignSubscription: async (partnerId: string, planId: string) => {
    const { data } = await apiClient.post<{ subscription: PartnerSubscription }>(
      '/billing/subscriptions',
      { partnerId, planId }
    );
    return data;
  },
};
