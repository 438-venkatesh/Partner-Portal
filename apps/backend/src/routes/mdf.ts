import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { mdfService } from '../services/mdfService';
import { createMdfFundSchema, updateMdfFundSchema, reviewMdfRequestSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function mdfRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/funds', async (_request, reply) => {
    const funds = await mdfService.listFunds();
    return reply.send({ funds });
  });

  fastify.post(
    '/funds',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(createMdfFundSchema) },
    },
    async (request, reply) => {
      const fund = await mdfService.createFund(request.body as any);
      return reply.code(201).send({ fund });
    }
  );

  fastify.patch(
    '/funds/:fundId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ fundId: z.string().uuid() })),
        body: zodToFastifySchema(updateMdfFundSchema),
      },
    },
    async (request, reply) => {
      const fund = await mdfService.updateFund((request.params as { fundId: string }).fundId, request.body as any);
      if (!fund) return reply.code(404).send({ message: 'Fund not found' });
      return reply.send({ fund });
    }
  );

  fastify.get(
    '/funds/:fundId/roi',
    { schema: { params: zodToFastifySchema(z.object({ fundId: z.string().uuid() })) } },
    async (request, reply) => {
      const roi = await mdfService.getFundRoi((request.params as { fundId: string }).fundId);
      return reply.send(roi);
    }
  );

  fastify.get('/requests', async (request, reply) => {
    const { status } = request.query as { status?: string };
    const requests = await mdfService.listAll({ status });
    return reply.send({ requests });
  });

  fastify.post(
    '/requests/:requestId/review',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ requestId: z.string().uuid() })),
        body: zodToFastifySchema(reviewMdfRequestSchema),
      },
    },
    async (request, reply) => {
      const { requestId } = request.params as { requestId: string };
      const { approved, approvedAmount, rejectionReason } = request.body as {
        approved: boolean;
        approvedAmount?: number;
        rejectionReason?: string;
      };
      try {
        const mdfRequest = await mdfService.review(requestId, approved, approvedAmount, rejectionReason, request.user!.userId!);
        return reply.send({ request: mdfRequest });
      } catch (error: any) {
        return reply.code(400).send({ message: error.message });
      }
    }
  );

  fastify.post(
    '/requests/:requestId/mark-paid',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ requestId: z.string().uuid() })) },
    },
    async (request, reply) => {
      const mdfRequest = await mdfService.markPaid((request.params as { requestId: string }).requestId);
      if (!mdfRequest) return reply.code(400).send({ message: 'Request must be claimed before it can be paid' });
      return reply.send({ request: mdfRequest });
    }
  );
}
