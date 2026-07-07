import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { segmentService } from '../services/segmentService';
import { createSegmentSchema, updateSegmentSchema, segmentCriteriaSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function partnerSegmentRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/', async (_request, reply) => {
    const segments = await segmentService.list();
    return reply.send({ segments });
  });

  fastify.post(
    '/preview',
    { schema: { body: zodToFastifySchema(segmentCriteriaSchema) } },
    async (request, reply) => {
      const result = await segmentService.previewMembers(request.body as any);
      return reply.send(result);
    }
  );

  fastify.post(
    '/',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(createSegmentSchema) },
    },
    async (request, reply) => {
      const segment = await segmentService.create(request.body as any, request.user?.userId);
      return reply.code(201).send({ segment });
    }
  );

  fastify.get(
    '/:segmentId/members',
    { schema: { params: zodToFastifySchema(z.object({ segmentId: z.string().uuid() })) } },
    async (request, reply) => {
      const result = await segmentService.getMembers((request.params as { segmentId: string }).segmentId);
      if (!result) return reply.code(404).send({ message: 'Segment not found' });
      return reply.send(result);
    }
  );

  fastify.patch(
    '/:segmentId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ segmentId: z.string().uuid() })),
        body: zodToFastifySchema(updateSegmentSchema),
      },
    },
    async (request, reply) => {
      const segment = await segmentService.update(
        (request.params as { segmentId: string }).segmentId,
        request.body as any
      );
      if (!segment) return reply.code(404).send({ message: 'Segment not found' });
      return reply.send({ segment });
    }
  );

  fastify.delete(
    '/:segmentId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ segmentId: z.string().uuid() })) },
    },
    async (request, reply) => {
      await segmentService.delete((request.params as { segmentId: string }).segmentId);
      return reply.code(204).send();
    }
  );
}
