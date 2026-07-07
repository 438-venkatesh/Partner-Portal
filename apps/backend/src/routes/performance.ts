import { FastifyInstance } from 'fastify';
import { performanceService } from '../services/performanceService';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function performanceRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // Get partner performance metrics
  fastify.get('/partner/:partnerId', {
    schema: {
      params: zodToFastifySchema(z.object({ partnerId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const metrics = await performanceService.getPartnerMetrics(
      request.params.partnerId,
      request.query
    );
    return reply.send(metrics);
  });

  // Get supplier performance metrics
  fastify.get('/supplier/:supplierId', {
    schema: {
      params: zodToFastifySchema(z.object({ supplierId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const metrics = await performanceService.getSupplierMetrics(
      request.params.supplierId,
      request.query
    );
    return reply.send(metrics);
  });

  // Get logistics performance metrics
  fastify.get('/logistics/:logisticsId', {
    schema: {
      params: zodToFastifySchema(z.object({ logisticsId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const metrics = await performanceService.getLogisticsMetrics(
      request.params.logisticsId,
      request.query
    );
    return reply.send(metrics);
  });
}

