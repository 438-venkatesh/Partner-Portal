import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { tierService } from '../services/tierService';
import { tierDefinitionInputSchema, updateTierDefinitionSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function partnerTierRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/', async (_request, reply) => {
    const tiers = await tierService.listDefinitions();
    return reply.send({ tiers });
  });

  fastify.post(
    '/',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(tierDefinitionInputSchema) },
    },
    async (request, reply) => {
      const tier = await tierService.createDefinition(request.body as any);
      return reply.code(201).send({ tier });
    }
  );

  fastify.patch(
    '/:tierCode',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ tierCode: z.string() })),
        body: zodToFastifySchema(updateTierDefinitionSchema),
      },
    },
    async (request, reply) => {
      const { tierCode } = request.params as { tierCode: string };
      const tier = await tierService.updateDefinition(tierCode, request.body as any);
      if (!tier) return reply.code(404).send({ message: 'Tier not found' });
      return reply.send({ tier });
    }
  );

  fastify.delete(
    '/:tierCode',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ tierCode: z.string() })) },
    },
    async (request, reply) => {
      await tierService.deleteDefinition((request.params as { tierCode: string }).tierCode);
      return reply.code(204).send();
    }
  );
}
