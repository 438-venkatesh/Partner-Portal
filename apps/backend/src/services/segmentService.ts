import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { partners, partnerSegments } from '../db/schema';
import type { CreateSegmentInput, SegmentCriteria } from '@partner-portal/common';

/** Builds the same drizzle where-clause from saved criteria that the live preview and the CRUD list both use. */
function buildWhere(criteria: SegmentCriteria) {
  const conditions = [];
  if (criteria.search) {
    conditions.push(
      or(
        ilike(partners.partnerName, `%${criteria.search}%`),
        ilike(partners.displayName, `%${criteria.search}%`)
      )!
    );
  }
  if (criteria.partnerTypes?.length) {
    conditions.push(
      or(...criteria.partnerTypes.map((t) => eq(partners.partnerType, t as any)))!
    );
  }
  if (criteria.statuses?.length) {
    conditions.push(or(...criteria.statuses.map((s) => eq(partners.status, s as any)))!);
  }
  if (criteria.tiers?.length) {
    conditions.push(or(...criteria.tiers.map((t) => eq(partners.tier, t)))!);
  }
  if (criteria.tags?.length) {
    // partners.tags is a JSONB array — match any partner whose tags array contains any requested tag.
    conditions.push(
      or(...criteria.tags.map((t) => sql`${partners.tags} @> ${JSON.stringify([t])}::jsonb`))!
    );
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export const segmentService = {
  async list() {
    return db.select().from(partnerSegments);
  },

  async create(input: CreateSegmentInput, createdBy?: string) {
    const [row] = await db
      .insert(partnerSegments)
      .values({
        name: input.name,
        description: input.description,
        criteria: input.criteria,
        createdBy: createdBy ?? null,
      })
      .returning();
    return row;
  },

  async update(segmentId: string, patch: Partial<CreateSegmentInput>) {
    const [row] = await db
      .update(partnerSegments)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(partnerSegments.segmentId, segmentId))
      .returning();
    return row ?? null;
  },

  async delete(segmentId: string) {
    await db.delete(partnerSegments).where(eq(partnerSegments.segmentId, segmentId));
  },

  /** Runs a saved (or ad-hoc, for live preview) criteria set against the partner table right now. */
  async previewMembers(criteria: SegmentCriteria, limit = 100) {
    const where = buildWhere(criteria);
    const query = db.select().from(partners);
    const rows = where ? await query.where(where).limit(limit) : await query.limit(limit);

    const countQuery = db.select({ c: sql<number>`count(*)`.as('c') }).from(partners);
    const [{ c }] = where ? await countQuery.where(where) : await countQuery;

    return { partners: rows, total: Number(c) || 0 };
  },

  async getMembers(segmentId: string, limit = 100) {
    const [segment] = await db
      .select()
      .from(partnerSegments)
      .where(eq(partnerSegments.segmentId, segmentId))
      .limit(1);
    if (!segment) return null;
    const result = await this.previewMembers(segment.criteria as SegmentCriteria, limit);
    return { segment, ...result };
  },
};
