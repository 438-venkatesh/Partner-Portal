import { z } from 'zod';

const slugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only');

export const createCoMarketingPageSchema = z.object({
  assetId: z.string().uuid().optional(),
  slug: slugSchema,
  headline: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  ctaLabel: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

export const updateCoMarketingPageSchema = createCoMarketingPageSchema.partial();

export const createReferralLinkSchema = z
  .object({
    campaignName: z.string().min(1).max(200),
    utmSource: z.string().max(100).optional(),
    utmMedium: z.string().max(100).optional(),
    utmCampaign: z.string().max(100).optional(),
    pageId: z.string().uuid().optional(),
    targetUrl: z.string().url().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => !!v.pageId || !!v.targetUrl, {
    message: 'Provide either a co-marketing page or a target URL',
    path: ['targetUrl'],
  });

export const updateReferralLinkSchema = z.object({
  campaignName: z.string().min(1).max(200).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  pageId: z.string().uuid().optional(),
  targetUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

export const publicLeadCaptureSchema = z.object({
  customerName: z.string().min(1).max(255),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  referralCode: z.string().max(30).optional(),
});

export type CreateCoMarketingPageInput = z.infer<typeof createCoMarketingPageSchema>;
export type CreateReferralLinkInput = z.infer<typeof createReferralLinkSchema>;
export type PublicLeadCaptureInput = z.infer<typeof publicLeadCaptureSchema>;
