import { asc, eq } from 'drizzle-orm';
import { db } from '../db';
import { salesPlaybooks, partners } from '../db/schema';
import type { CreatePlaybookInput } from '@partner-portal/common';

export const playbookService = {
  async listAll() {
    return db.select().from(salesPlaybooks).orderBy(asc(salesPlaybooks.sortOrder));
  },

  async create(input: CreatePlaybookInput) {
    const [playbook] = await db
      .insert(salesPlaybooks)
      .values({
        title: input.title,
        dealStage: input.dealStage,
        partnerType: input.partnerType,
        content: input.content,
        recommendedAssetIds: input.recommendedAssetIds ?? [],
        isActive: input.isActive ?? true,
      })
      .returning();
    return playbook;
  },

  async update(playbookId: string, patch: Partial<CreatePlaybookInput>) {
    const [playbook] = await db
      .update(salesPlaybooks)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(salesPlaybooks.playbookId, playbookId))
      .returning();
    return playbook ?? null;
  },

  async delete(playbookId: string) {
    await db.delete(salesPlaybooks).where(eq(salesPlaybooks.playbookId, playbookId));
  },

  /** Playbooks relevant to a partner, optionally narrowed to a specific deal stage. */
  async listForPartner(partnerId: string, dealStage?: string) {
    const [partner] = await db
      .select({ partnerType: partners.partnerType })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);

    const all = await this.listAll();
    return all.filter(
      (p) =>
        p.isActive &&
        (!p.partnerType || p.partnerType === partner?.partnerType) &&
        (!dealStage || !p.dealStage || p.dealStage === dealStage)
    );
  },
};
