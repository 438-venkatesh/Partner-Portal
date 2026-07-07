import { apiClient } from './client';

export interface DirectoryPartner {
  partnerId: string;
  partnerName: string;
  displayName: string | null;
  partnerType: string;
  tier: string | null;
  logoUrl: string | null;
  website: string | null;
  description: string | null;
}

export interface DirectoryQuery {
  page?: number;
  limit?: number;
  search?: string;
  partnerType?: string;
  tier?: string;
}

export const directoryApi = {
  search: async (query?: DirectoryQuery) => {
    const { data } = await apiClient.get<{
      partners: DirectoryPartner[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/directory', { params: query });
    return data;
  },
};
