import { apiClient } from './client';

export interface BillingPlan {
  planId: string;
  planName: string;
  priceCents: number;
  currency: string;
  features?: unknown;
  isActive: boolean;
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

export interface BillingInvoice {
  invoiceId: string;
  partnerId: string;
  subscriptionId: string;
  planName: string;
  amountCents: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: 'unpaid' | 'paid' | 'void';
  paidAt: string | null;
  paidReference: string | null;
  createdAt?: string | null;
}

export const billingAdminApi = {
  listPlans: async () => {
    const { data } = await apiClient.get<{ plans: BillingPlan[] }>('/billing/plans');
    return data;
  },

  createPlan: async (input: { planName: string; priceCents: number; currency?: string }) => {
    const { data } = await apiClient.post<{ plan: BillingPlan }>('/billing/plans', input);
    return data.plan;
  },

  updatePlan: async (planId: string, patch: Partial<BillingPlan>) => {
    const { data } = await apiClient.patch<{ plan: BillingPlan }>(`/billing/plans/${planId}`, patch);
    return data.plan;
  },

  assignSubscription: async (partnerId: string, planId: string, billingCycle?: string) => {
    const { data } = await apiClient.post<{ subscription: PartnerSubscription }>(
      '/billing/subscriptions',
      { partnerId, planId, billingCycle }
    );
    return data;
  },

  listInvoices: async (status?: string) => {
    const { data } = await apiClient.get<{ invoices: Array<{ invoice: BillingInvoice; partnerName: string | null }> }>(
      '/billing/invoices',
      { params: { status } }
    );
    return data.invoices;
  },

  runBillingCycle: async () => {
    const { data } = await apiClient.post<{ checked: number; generated: number }>('/billing/invoices/run-billing-cycle');
    return data;
  },

  markInvoicePaid: async (invoiceId: string, paidReference?: string) => {
    const { data } = await apiClient.post<{ invoice: BillingInvoice }>(`/billing/invoices/${invoiceId}/mark-paid`, {
      paidReference,
    });
    return data.invoice;
  },
};
