import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { leadService } from '../services/leadService';
import { createLeadSchema, createLeadRoutingRuleSchema, updateLeadRoutingRuleSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function leadRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/', async (_request, reply) => {
    const leads = await leadService.listAll();
    return reply.send({ leads });
  });

  fastify.post(
    '/',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(createLeadSchema) },
    },
    async (request, reply) => {
      const lead = await leadService.createLead(request.body as any);
      return reply.code(201).send({ lead });
    }
  );

  fastify.get('/routing-rules', async (_request, reply) => {
    const rules = await leadService.listRoutingRules();
    return reply.send({ rules });
  });

  fastify.post(
    '/routing-rules',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(createLeadRoutingRuleSchema) },
    },
    async (request, reply) => {
      const rule = await leadService.createRoutingRule(request.body as any);
      return reply.code(201).send({ rule });
    }
  );

  fastify.patch(
    '/routing-rules/:ruleId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ ruleId: z.string().uuid() })),
        body: zodToFastifySchema(updateLeadRoutingRuleSchema),
      },
    },
    async (request, reply) => {
      const rule = await leadService.updateRoutingRule(
        (request.params as { ruleId: string }).ruleId,
        request.body as any
      );
      if (!rule) return reply.code(404).send({ message: 'Rule not found' });
      return reply.send({ rule });
    }
  );

  fastify.delete(
    '/routing-rules/:ruleId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ ruleId: z.string().uuid() })) },
    },
    async (request, reply) => {
      await leadService.deleteRoutingRule((request.params as { ruleId: string }).ruleId);
      return reply.code(204).send();
    }
  );
}
