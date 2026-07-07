import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticatePartner } from '../middleware/partnerAuth';
import { leadService } from '../services/leadService';
import { respondToLeadSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function partnerLeadsPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/', async (request, reply) => {
    const leads = await leadService.listForPartner(request.partnerUser!.partnerId);
    return reply.send({ leads });
  });

  fastify.post(
    '/:leadId/respond',
    {
      schema: {
        params: zodToFastifySchema(z.object({ leadId: z.string().uuid() })),
        body: zodToFastifySchema(respondToLeadSchema),
      },
    },
    async (request, reply) => {
      const { leadId } = request.params as { leadId: string };
      const { accepted } = request.body as { accepted: boolean };
      const lead = await leadService.respond(leadId, request.partnerUser!.partnerId, accepted);
      return reply.send({ lead });
    }
  );
}
