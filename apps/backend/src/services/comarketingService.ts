import crypto from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { coMarketingPages, referralLinks, marketingAssets, partners, leads } from '../db/schema';
import { notificationService } from './notificationService';
import type { CreateCoMarketingPageInput, CreateReferralLinkInput, PublicLeadCaptureInput } from '@partner-portal/common';

function generateCode(): string {
  return crypto.randomBytes(5).toString('hex');
}

function frontendUrl(path: string): string {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}${path}`;
}

function appendQueryParams(url: string, params: Record<string, string | undefined>): string {
  const [base, hash] = url.split('#');
  const [path, existingQuery] = base.split('?');
  const query = new URLSearchParams(existingQuery);
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const queryString = query.toString();
  return `${path}${queryString ? `?${queryString}` : ''}${hash ? `#${hash}` : ''}`;
}

export const comarketingService = {
  // ---- co-marketing pages (partner-authored microsites) ----
  async listEligibleAssets() {
    return db.select().from(marketingAssets).where(and(eq(marketingAssets.isActive, true), eq(marketingAssets.allowCoBranding, true)));
  },

  async createPage(partnerId: string, input: CreateCoMarketingPageInput) {
    if (input.assetId) {
      const [asset] = await db
        .select()
        .from(marketingAssets)
        .where(and(eq(marketingAssets.assetId, input.assetId), eq(marketingAssets.allowCoBranding, true)))
        .limit(1);
      if (!asset) throw new Error('Selected asset is not approved for co-branding');
    }

    const [page] = await db
      .insert(coMarketingPages)
      .values({
        partnerId,
        assetId: input.assetId,
        slug: input.slug,
        headline: input.headline,
        description: input.description,
        ctaLabel: input.ctaLabel,
        isActive: input.isActive ?? true,
      })
      .returning();
    return page;
  },

  async listPagesForPartner(partnerId: string) {
    return db.select().from(coMarketingPages).where(eq(coMarketingPages.partnerId, partnerId));
  },

  async listAllPages() {
    return db
      .select({
        page: coMarketingPages,
        partnerName: partners.partnerName,
      })
      .from(coMarketingPages)
      .leftJoin(partners, eq(coMarketingPages.partnerId, partners.partnerId));
  },

  async updatePage(pageId: string, partnerId: string, patch: Partial<CreateCoMarketingPageInput>) {
    const [existing] = await db.select().from(coMarketingPages).where(eq(coMarketingPages.pageId, pageId)).limit(1);
    if (!existing || existing.partnerId !== partnerId) throw new Error('Page not found');

    const [page] = await db
      .update(coMarketingPages)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(coMarketingPages.pageId, pageId))
      .returning();
    return page;
  },

  async deletePage(pageId: string, partnerId: string) {
    const [existing] = await db.select().from(coMarketingPages).where(eq(coMarketingPages.pageId, pageId)).limit(1);
    if (!existing || existing.partnerId !== partnerId) throw new Error('Page not found');
    await db.delete(coMarketingPages).where(eq(coMarketingPages.pageId, pageId));
  },

  /** Public: renders a partner's co-branded microsite. */
  async getPublicPage(slug: string) {
    const [page] = await db
      .select()
      .from(coMarketingPages)
      .where(and(eq(coMarketingPages.slug, slug), eq(coMarketingPages.isActive, true)))
      .limit(1);
    if (!page) return null;

    const [partner] = await db
      .select({ partnerName: partners.partnerName, displayName: partners.displayName, logoUrl: partners.logoUrl })
      .from(partners)
      .where(eq(partners.partnerId, page.partnerId))
      .limit(1);

    const asset = page.assetId
      ? (await db.select().from(marketingAssets).where(eq(marketingAssets.assetId, page.assetId)).limit(1))[0]
      : null;

    await db
      .update(coMarketingPages)
      .set({ viewCount: sql`${coMarketingPages.viewCount} + 1` })
      .where(eq(coMarketingPages.pageId, page.pageId));

    return { page, partner, asset: asset ?? null };
  },

  /** Public: the microsite's lead-capture form submits here — attributed straight to the owning partner. */
  async submitPageLead(slug: string, input: PublicLeadCaptureInput) {
    const [page] = await db
      .select()
      .from(coMarketingPages)
      .where(and(eq(coMarketingPages.slug, slug), eq(coMarketingPages.isActive, true)))
      .limit(1);
    if (!page) throw new Error('Page not found');

    let referralLinkId: string | null = null;
    if (input.referralCode) {
      const [link] = await db
        .select()
        .from(referralLinks)
        .where(and(eq(referralLinks.code, input.referralCode), eq(referralLinks.isActive, true)))
        .limit(1);
      if (link && link.partnerId === page.partnerId) referralLinkId = link.linkId;
    }

    const [lead] = await db
      .insert(leads)
      .values({
        source: 'co_marketing_page',
        customerName: input.customerName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        notes: input.notes,
        assignedPartnerId: page.partnerId,
        status: 'assigned',
        coMarketingPageId: page.pageId,
        referralLinkId,
        assignedAt: new Date(),
      })
      .returning();

    await db
      .update(coMarketingPages)
      .set({ leadCount: sql`${coMarketingPages.leadCount} + 1` })
      .where(eq(coMarketingPages.pageId, page.pageId));
    if (referralLinkId) {
      await db
        .update(referralLinks)
        .set({ leadCount: sql`${referralLinks.leadCount} + 1` })
        .where(eq(referralLinks.linkId, referralLinkId));
    }

    await notificationService.createForAllPartnerUsers(page.partnerId, {
      type: 'lead_assigned',
      title: `New lead from your co-marketing page: ${lead.customerName}`,
      body: 'A visitor submitted your co-branded landing page — follow up to start the opportunity.',
    });

    return { success: true };
  },

  // ---- referral / campaign links ----
  async createLink(partnerId: string, input: CreateReferralLinkInput) {
    if (input.pageId) {
      const [page] = await db.select().from(coMarketingPages).where(eq(coMarketingPages.pageId, input.pageId)).limit(1);
      if (!page || page.partnerId !== partnerId) throw new Error('Co-marketing page not found');
    }

    const [link] = await db
      .insert(referralLinks)
      .values({
        partnerId,
        code: generateCode(),
        campaignName: input.campaignName,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        pageId: input.pageId,
        targetUrl: input.targetUrl,
        isActive: input.isActive ?? true,
      })
      .returning();
    return link;
  },

  async listLinksForPartner(partnerId: string) {
    return db.select().from(referralLinks).where(eq(referralLinks.partnerId, partnerId));
  },

  async listAllLinks() {
    return db
      .select({ link: referralLinks, partnerName: partners.partnerName })
      .from(referralLinks)
      .leftJoin(partners, eq(referralLinks.partnerId, partners.partnerId));
  },

  async updateLink(linkId: string, partnerId: string, patch: Partial<CreateReferralLinkInput>) {
    const [existing] = await db.select().from(referralLinks).where(eq(referralLinks.linkId, linkId)).limit(1);
    if (!existing || existing.partnerId !== partnerId) throw new Error('Link not found');

    const [link] = await db
      .update(referralLinks)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(referralLinks.linkId, linkId))
      .returning();
    return link;
  },

  async deleteLink(linkId: string, partnerId: string) {
    const [existing] = await db.select().from(referralLinks).where(eq(referralLinks.linkId, linkId)).limit(1);
    if (!existing || existing.partnerId !== partnerId) throw new Error('Link not found');
    await db.delete(referralLinks).where(eq(referralLinks.linkId, linkId));
  },

  /** Public: resolves a shared code to a redirect target, tracking the click. */
  async resolveRedirect(code: string): Promise<string | null> {
    const [link] = await db
      .select()
      .from(referralLinks)
      .where(and(eq(referralLinks.code, code), eq(referralLinks.isActive, true)))
      .limit(1);
    if (!link) return null;

    await db
      .update(referralLinks)
      .set({ clickCount: sql`${referralLinks.clickCount} + 1` })
      .where(eq(referralLinks.linkId, link.linkId));

    const utmParams = { utm_source: link.utmSource ?? undefined, utm_medium: link.utmMedium ?? undefined, utm_campaign: link.utmCampaign ?? undefined, ref: link.code };

    if (link.pageId) {
      const [page] = await db.select().from(coMarketingPages).where(eq(coMarketingPages.pageId, link.pageId)).limit(1);
      if (page) return appendQueryParams(frontendUrl(`/co/${page.slug}`), utmParams);
    }

    return appendQueryParams(link.targetUrl ?? frontendUrl('/'), utmParams);
  },
};
