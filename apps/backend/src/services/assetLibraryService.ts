import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { marketingAssets, partners } from '../db/schema';
import { cloudinaryService } from './cloudinaryService';
import { collectMultipartUpload } from '../utils/readMultipartField';
import { createAssetSchema, type CreateAssetInput } from '@partner-portal/common';
import type { FastifyRequest } from 'fastify';

const TIER_RANK: Record<string, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

function tierMeetsMinimum(partnerTier: string | null, minTier: string | null | undefined): boolean {
  if (!minTier) return true;
  if (!partnerTier) return false;
  return (TIER_RANK[partnerTier.toLowerCase()] ?? -1) >= (TIER_RANK[minTier.toLowerCase()] ?? Infinity);
}

export const assetLibraryService = {
  async listAll() {
    return db.select().from(marketingAssets).orderBy(asc(marketingAssets.createdAt));
  },

  /** Parses the CreateAssetInput fields from multipart text fields and uploads the file to Cloudinary. */
  async createFromUpload(request: FastifyRequest) {
    const { textFields, file } = await collectMultipartUpload(request);
    if (!file) {
      throw new Error('No file uploaded. Send it as multipart form-data under any file field.');
    }

    const parsed: CreateAssetInput = createAssetSchema.parse({
      title: textFields.title,
      description: textFields.description || undefined,
      category: textFields.category || undefined,
      partnerType: textFields.partnerType || undefined,
      minTier: textFields.minTier || undefined,
      tags: textFields.tags ? textFields.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    });

    const uploaded = await cloudinaryService.uploadAsset({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalFilename: file.originalFilename || 'asset',
    });

    const [asset] = await db
      .insert(marketingAssets)
      .values({
        title: parsed.title,
        description: parsed.description,
        category: parsed.category ?? 'other',
        fileUrl: uploaded.secureUrl,
        partnerType: parsed.partnerType,
        minTier: parsed.minTier,
        tags: parsed.tags ?? [],
      })
      .returning();
    return asset;
  },

  async update(assetId: string, patch: Partial<CreateAssetInput>) {
    const [asset] = await db
      .update(marketingAssets)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(marketingAssets.assetId, assetId))
      .returning();
    return asset ?? null;
  },

  async delete(assetId: string) {
    await db.delete(marketingAssets).where(eq(marketingAssets.assetId, assetId));
  },

  async listForPartner(partnerId: string) {
    const [partner] = await db
      .select({ partnerType: partners.partnerType, tier: partners.tier })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);

    const all = await this.listAll();
    return all.filter(
      (a) =>
        a.isActive &&
        (!a.partnerType || a.partnerType === partner?.partnerType) &&
        tierMeetsMinimum(partner?.tier ?? null, a.minTier)
    );
  },

  async recordDownload(assetId: string) {
    const [asset] = await db
      .update(marketingAssets)
      .set({ downloadCount: sql`${marketingAssets.downloadCount} + 1` })
      .where(eq(marketingAssets.assetId, assetId))
      .returning();
    return asset ?? null;
  },
};
