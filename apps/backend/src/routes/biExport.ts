import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { authenticateApiKey } from '../middleware/authenticateApiKey';
import { db } from '../db';
import { deals, leads, commissionRecords } from '../db/schema';
import { performanceService } from '../services/performanceService';

/**
 * Machine-to-machine data feed for a partner's own BI tooling (Tableau/Power BI/Looker generic
 * REST/JSON connectors) — authenticated with the partner's own API key, never a JWT. Scoped
 * strictly to that key's partnerId; there is no cross-partner data here.
 */
export async function biExportRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticateApiKey);

  fastify.get('/deals', async (request, reply) => {
    const rows = await db.select().from(deals).where(eq(deals.partnerId, request.apiPartnerId!));
    return reply.send({ deals: rows });
  });

  fastify.get('/leads', async (request, reply) => {
    const rows = await db.select().from(leads).where(eq(leads.assignedPartnerId, request.apiPartnerId!));
    return reply.send({ leads: rows });
  });

  fastify.get('/commissions', async (request, reply) => {
    const rows = await db
      .select()
      .from(commissionRecords)
      .where(eq(commissionRecords.partnerId, request.apiPartnerId!));
    return reply.send({ commissions: rows });
  });

  fastify.get('/summary', async (request, reply) => {
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 90);
    const summary = await performanceService.getPartnerMetrics(request.apiPartnerId!, {
      periodStart,
      periodEnd,
      periodType: 'monthly',
    });
    return reply.send(summary);
  });
}
