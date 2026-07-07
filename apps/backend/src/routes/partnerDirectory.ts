import { FastifyInstance } from 'fastify';
import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { partners } from '../db/schema';
import { directoryQuerySchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

/**
 * Public "find a partner" directory — no auth. Only ever exposes fields a customer browsing
 * for a partner should see; never touches internal fields (tenantId, approvedBy, metadata, etc.).
 */
export async function partnerDirectoryRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: { querystring: zodToFastifySchema(directoryQuerySchema) },
  }, async (request, reply) => {
    const { page, limit, search, partnerType, tier } = request.query as {
      page: number;
      limit: number;
      search?: string;
      partnerType?: string;
      tier?: string;
    };
    const offset = (page - 1) * limit;

    const conditions = [eq(partners.status, 'active'), eq(partners.isDirectoryListed, true)];
    if (search) {
      conditions.push(
        or(
          like(partners.partnerName, `%${search}%`),
          like(partners.displayName, `%${search}%`)
        )!
      );
    }
    if (partnerType) conditions.push(eq(partners.partnerType, partnerType as any));
    if (tier) conditions.push(eq(partners.tier, tier));

    const where = and(...conditions);

    const rows = await db
      .select({
        partnerId: partners.partnerId,
        partnerName: partners.partnerName,
        displayName: partners.displayName,
        partnerType: partners.partnerType,
        tier: partners.tier,
        logoUrl: partners.logoUrl,
        website: partners.website,
        description: partners.description,
      })
      .from(partners)
      .where(where)
      .orderBy(asc(partners.partnerName))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(partners)
      .where(where);

    return reply.send({
      partners: rows,
      pagination: {
        page,
        limit,
        total: Number(count) || 0,
        totalPages: Math.ceil((Number(count) || 0) / limit),
      },
    });
  });
}
