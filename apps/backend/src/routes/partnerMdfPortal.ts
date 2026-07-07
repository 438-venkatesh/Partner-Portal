import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticatePartner } from '../middleware/partnerAuth';
import { mdfService } from '../services/mdfService';
import { createMdfRequestSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function partnerMdfPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/funds', async (_request, reply) => {
    const funds = await mdfService.listFunds();
    return reply.send({ funds: funds.filter((f) => f.isActive) });
  });

  fastify.get('/requests', async (request, reply) => {
    const requests = await mdfService.listForPartner(request.partnerUser!.partnerId);
    return reply.send({ requests });
  });

  fastify.post(
    '/requests',
    { schema: { body: zodToFastifySchema(createMdfRequestSchema) } },
    async (request, reply) => {
      const mdfRequest = await mdfService.submitRequest(request.partnerUser!.partnerId, request.body as any);
      return reply.code(201).send({ request: mdfRequest });
    }
  );

  fastify.post(
    '/requests/:requestId/claim',
    {
      schema: {
        params: zodToFastifySchema(z.object({ requestId: z.string().uuid() })),
        body: zodToFastifySchema(z.object({ proofOfExpenseUrl: z.string().url().optional() })),
      },
    },
    async (request, reply) => {
      const { requestId } = request.params as { requestId: string };
      const { proofOfExpenseUrl } = request.body as { proofOfExpenseUrl?: string };
      try {
        const mdfRequest = await mdfService.claim(requestId, request.partnerUser!.partnerId, proofOfExpenseUrl);
        return reply.send({ request: mdfRequest });
      } catch (error: any) {
        return reply.code(400).send({ message: error.message });
      }
    }
  );
}
