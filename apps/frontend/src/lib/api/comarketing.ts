import { apiClient } from './client';
import type { MarketingAsset } from './enablement';

export interface CoMarketingPage {
  pageId: string;
  partnerId: string;
  assetId: string | null;
  slug: string;
  headline: string;
  description: string | null;
  ctaLabel: string;
  isActive: boolean;
  viewCount: number;
  leadCount: number;
}

export interface ReferralLink {
  linkId: string;
  partnerId: string;
  code: string;
  campaignName: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  pageId: string | null;
  targetUrl: string | null;
  clickCount: number;
  leadCount: number;
  isActive: boolean;
}

export interface PublicPageContent {
  page: CoMarketingPage;
  partner: { partnerName: string; displayName: string | null; logoUrl: string | null } | null;
  asset: MarketingAsset | null;
}

export const comarketingApi = {
  // ---- admin oversight ----
  listAllPages: async () => {
    const { data } = await apiClient.get<{ pages: Array<{ page: CoMarketingPage; partnerName: string | null }> }>(
      '/comarketing/pages'
    );
    return data.pages;
  },
  listAllLinks: async () => {
    const { data } = await apiClient.get<{ links: Array<{ link: ReferralLink; partnerName: string | null }> }>(
      '/comarketing/links'
    );
    return data.links;
  },

  // ---- partner-facing ----
  listEligibleAssets: async () => {
    const { data } = await apiClient.get<{ assets: MarketingAsset[] }>('/partner-comarketing/eligible-assets');
    return data.assets;
  },
  listMyPages: async () => {
    const { data } = await apiClient.get<{ pages: CoMarketingPage[] }>('/partner-comarketing/pages');
    return data.pages;
  },
  createPage: async (input: { assetId?: string; slug: string; headline: string; description?: string; ctaLabel?: string }) => {
    const { data } = await apiClient.post<{ page: CoMarketingPage }>('/partner-comarketing/pages', input);
    return data.page;
  },
  updatePage: async (pageId: string, patch: Partial<CoMarketingPage>) => {
    const { data } = await apiClient.patch<{ page: CoMarketingPage }>(`/partner-comarketing/pages/${pageId}`, patch);
    return data.page;
  },
  deletePage: async (pageId: string) => {
    await apiClient.delete(`/partner-comarketing/pages/${pageId}`);
  },
  listMyLinks: async () => {
    const { data } = await apiClient.get<{ links: ReferralLink[] }>('/partner-comarketing/links');
    return data.links;
  },
  createLink: async (input: {
    campaignName: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    pageId?: string;
    targetUrl?: string;
  }) => {
    const { data } = await apiClient.post<{ link: ReferralLink }>('/partner-comarketing/links', input);
    return data.link;
  },
  updateLink: async (linkId: string, patch: Partial<ReferralLink>) => {
    const { data } = await apiClient.patch<{ link: ReferralLink }>(`/partner-comarketing/links/${linkId}`, patch);
    return data.link;
  },
  deleteLink: async (linkId: string) => {
    await apiClient.delete(`/partner-comarketing/links/${linkId}`);
  },

  // ---- public microsite ----
  getPublicPage: async (slug: string) => {
    const { data } = await apiClient.get<PublicPageContent>(`/co-marketing/pages/${slug}`);
    return data;
  },
  submitPageLead: async (
    slug: string,
    input: { customerName: string; contactEmail?: string; contactPhone?: string; notes?: string; referralCode?: string }
  ) => {
    const { data } = await apiClient.post<{ success: boolean }>(`/co-marketing/pages/${slug}/leads`, input);
    return data;
  },
};
