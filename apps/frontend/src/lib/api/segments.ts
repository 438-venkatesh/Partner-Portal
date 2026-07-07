import { apiClient } from './client';
import type { PartnerResponse } from '@partner-portal/common';

export interface SegmentCriteria {
  search?: string;
  partnerTypes?: string[];
  statuses?: string[];
  tiers?: string[];
  tags?: string[];
}

export interface Segment {
  segmentId: string;
  name: string;
  description: string | null;
  criteria: SegmentCriteria;
  createdAt: string;
}

export const segmentsApi = {
  list: async () => {
    const { data } = await apiClient.get<{ segments: Segment[] }>('/partner-segments');
    return data.segments;
  },
  create: async (input: { name: string; description?: string; criteria: SegmentCriteria }) => {
    const { data } = await apiClient.post<{ segment: Segment }>('/partner-segments', input);
    return data.segment;
  },
  remove: async (segmentId: string) => {
    await apiClient.delete(`/partner-segments/${segmentId}`);
  },
  preview: async (criteria: SegmentCriteria) => {
    const { data } = await apiClient.post<{ partners: PartnerResponse[]; total: number }>(
      '/partner-segments/preview',
      criteria
    );
    return data;
  },
  getMembers: async (segmentId: string) => {
    const { data } = await apiClient.get<{ segment: Segment; partners: PartnerResponse[]; total: number }>(
      `/partner-segments/${segmentId}/members`
    );
    return data;
  },
};
