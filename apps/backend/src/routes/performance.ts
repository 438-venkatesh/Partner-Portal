import { FastifyInstance } from 'fastify';
import { performanceService } from '../services/performanceService';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';

const periodQuerySchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  periodType: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  tenantId: z.string().uuid().optional(),
});

export async function performanceRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // Get partner performance metrics
  fastify.get('/partner/:partnerId', {
    schema: {
      params: zodToFastifySchema(z.object({ partnerId: z.string().uuid() })),
      querystring: zodToFastifySchema(periodQuerySchema),
    },
  }, async (request, reply) => {
    const query = request.query as z.infer<typeof periodQuerySchema>;
    const metrics = await performanceService.getPartnerMetrics(request.params.partnerId, {
      periodStart: new Date(query.periodStart),
      periodEnd: new Date(query.periodEnd),
      periodType: query.periodType,
    });
    return reply.send(metrics);
  });

  // Get supplier performance metrics
  fastify.get('/supplier/:supplierId', {
    schema: {
      params: zodToFastifySchema(z.object({ supplierId: z.string().uuid() })),
      querystring: zodToFastifySchema(periodQuerySchema),
    },
  }, async (request, reply) => {
    const query = request.query as z.infer<typeof periodQuerySchema>;
    const metrics = await performanceService.getSupplierMetrics(request.params.supplierId, {
      tenantId: query.tenantId,
      periodStart: new Date(query.periodStart),
      periodEnd: new Date(query.periodEnd),
      periodType: query.periodType,
    });
    return reply.send(metrics);
  });

  // Get logistics performance metrics
  fastify.get('/logistics/:logisticsId', {
    schema: {
      params: zodToFastifySchema(z.object({ logisticsId: z.string().uuid() })),
      querystring: zodToFastifySchema(periodQuerySchema),
    },
  }, async (request, reply) => {
    const query = request.query as z.infer<typeof periodQuerySchema>;
    const metrics = await performanceService.getLogisticsMetrics(request.params.logisticsId, {
      tenantId: query.tenantId,
      periodStart: new Date(query.periodStart),
      periodEnd: new Date(query.periodEnd),
      periodType: query.periodType,
    });
    return reply.send(metrics);
  });
}

