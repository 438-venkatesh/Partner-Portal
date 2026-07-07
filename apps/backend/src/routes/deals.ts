import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { dealService } from '../services/dealService';
import { registerDealSchema, reviewDealSchema, resolveDealSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function dealRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/', async (request, reply) => {
    const { status } = request.query as { status?: string };
    const deals = await dealService.listAll({ status });
    return reply.send({ deals });
  });

  fastify.get(
    '/:dealId',
    { schema: { params: zodToFastifySchema(z.object({ dealId: z.string().uuid() })) } },
    async (request, reply) => {
      const deal = await dealService.getById((request.params as { dealId: string }).dealId);
      if (!deal) return reply.code(404).send({ message: 'Deal not found' });
      return reply.send({ deal });
    }
  );

  // Staff registers a deal on behalf of a partner — the "on-behalf" registration item.
  fastify.post(
    '/on-behalf/:partnerId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ partnerId: z.string().uuid() })),
        body: zodToFastifySchema(registerDealSchema),
      },
    },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const result = await dealService.registerDeal(partnerId, request.body as any, undefined, request.user?.userId);
      return reply.code(201).send(result);
    }
  );

  fastify.post(
    '/:dealId/review',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ dealId: z.string().uuid() })),
        body: zodToFastifySchema(reviewDealSchema),
      },
    },
    async (request, reply) => {
      const { dealId } = request.params as { dealId: string };
      const { approved, rejectionReason } = request.body as { approved: boolean; rejectionReason?: string };
      const deal = await dealService.review(dealId, approved, rejectionReason, request.user!.userId!);
      return reply.send({ deal });
    }
  );

  fastify.post(
    '/:dealId/resolve',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ dealId: z.string().uuid() })),
        body: zodToFastifySchema(resolveDealSchema),
      },
    },
    async (request, reply) => {
      const { dealId } = request.params as { dealId: string };
      const { outcome, actualValue } = request.body as { outcome: 'won' | 'lost'; actualValue?: number };
      const deal = await dealService.resolve(dealId, outcome, actualValue, request.user!.userId!);
      return reply.send({ deal });
    }
  );
}
