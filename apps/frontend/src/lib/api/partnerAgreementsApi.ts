import { partnerApiClient } from './partnerClient';

export interface PartnerPortalAgreement {
  agreementId: string;
  partnerId: string;
  tenantId?: string | null;
  agreementType: string;
  agreementNumber: string;
  title: string;
  description?: string | null;
  status: string;
  platformSignedAt?: string | null;
  signedByPlatform?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export const partnerAgreementsApi = {
  list: async () => {
    const { data } = await partnerApiClient.get<{ agreements: PartnerPortalAgreement[] }>(
      '/partner-agreements'
    );
    return data;
  },

  get: async (agreementId: string) => {
    const { data } = await partnerApiClient.get<{ agreement: PartnerPortalAgreement }>(
      `/partner-agreements/${agreementId}`
    );
    return data;
  },

  sign: async (agreementId: string, fullName: string) => {
    const { data } = await partnerApiClient.post<{ agreement: PartnerPortalAgreement }>(
      `/partner-agreements/${agreementId}/sign`,
      { fullName }
    );
    return data;
  },
};
