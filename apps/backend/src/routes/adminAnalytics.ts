import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { adminAnalyticsService } from '../services/adminAnalyticsService';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function adminAnalyticsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get(
    '/overview',
    { schema: { querystring: zodToFastifySchema(z.object({ periodDays: z.coerce.number().int().positive().optional() })) } },
    async (request, reply) => {
      const { periodDays } = request.query as { periodDays?: number };
      const overview = await adminAnalyticsService.getOverview(periodDays);
      return reply.send(overview);
    }
  );

  fastify.get('/mdf-roi', async (_request, reply) => {
    const summary = await adminAnalyticsService.getMdfRoiSummary();
    return reply.send(summary);
  });
}
