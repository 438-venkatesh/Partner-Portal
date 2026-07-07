import { partnerApiClient } from './partnerClient';

export interface PartnerApiKeyRow {
  keyId: string;
  keyPrefix: string;
  scopes?: unknown;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt?: string | null;
}

export const partnerApiKeysApi = {
  list: async () => {
    const { data } = await partnerApiClient.get<{ keys: PartnerApiKeyRow[] }>('/partner-api-keys');
    return data;
  },

  create: async () => {
    const { data } = await partnerApiClient.post<{
      keyId: string;
      keyPrefix: string;
      rawKey: string;
    }>('/partner-api-keys');
    return data;
  },

  revoke: async (keyId: string) => {
    await partnerApiClient.delete(`/partner-api-keys/${keyId}`);
  },
};
