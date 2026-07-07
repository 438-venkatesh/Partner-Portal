import { partnerApiClient } from './partnerClient';

export interface PartnerSubscriptionRow {
  subscriptionId: string;
  partnerId: string;
  planId: string;
  status: string;
  billingCycle: string;
  nextBillingDate?: string | null;
  createdAt?: string | null;
}

export interface PartnerBillingInvoiceRow {
  invoiceId: string;
  planName: string;
  amountCents: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: 'unpaid' | 'paid' | 'void';
  paidAt: string | null;
}

export const partnerBillingApi = {
  getSubscription: async () => {
    const { data } = await partnerApiClient.get<{ subscription: PartnerSubscriptionRow | null }>(
      '/partner-billing/subscription'
    );
    return data;
  },

  listInvoices: async () => {
    const { data } = await partnerApiClient.get<{ invoices: PartnerBillingInvoiceRow[] }>('/partner-billing/invoices');
    return data.invoices;
  },
};
