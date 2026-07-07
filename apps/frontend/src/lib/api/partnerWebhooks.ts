import { partnerApiClient } from './partnerClient';

export interface PartnerWebhookRow {
  webhookId: string;
  partnerId: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt?: string | null;
}

export const partnerWebhooksApi = {
  list: async () => {
    const { data } = await partnerApiClient.get<{ webhooks: PartnerWebhookRow[] }>(
      '/partner-webhooks'
    );
    return data;
  },

  create: async (body: { url: string; events: string[] }) => {
    const { data } = await partnerApiClient.post<{ webhook: PartnerWebhookRow; secret: string }>(
      '/partner-webhooks',
      body
    );
    return data;
  },

  delete: async (webhookId: string) => {
    await partnerApiClient.delete(`/partner-webhooks/${webhookId}`);
  },

  test: async (webhookId: string) => {
    await partnerApiClient.post(`/partner-webhooks/${webhookId}/test`);
  },
};
