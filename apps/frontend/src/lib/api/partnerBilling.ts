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

export const partnerBillingApi = {
  getSubscription: async () => {
    const { data } = await partnerApiClient.get<{ subscription: PartnerSubscriptionRow | null }>(
      '/partner-billing/subscription'
    );
    return data;
  },
};
