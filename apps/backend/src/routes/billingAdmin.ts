import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { billingService } from '../services/billingService';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';

const assignSchema = z.object({
  partnerId: z.string().uuid(),
  planId: z.string().uuid(),
});

export async function billingAdminRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/plans', async (_request, reply) => {
    const plans = await billingService.listPlans();
    return reply.send({ plans });
  });

  fastify.post(
    '/subscriptions',
    {
      schema: { body: zodToFastifySchema(assignSchema) },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof assignSchema>;
      const sub = await billingService.assignPlan(body.partnerId, body.planId);
      return reply.code(201).send({ subscription: sub });
    }
  );
}
