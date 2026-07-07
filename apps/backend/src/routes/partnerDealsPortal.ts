import { FastifyInstance } from 'fastify';
import { authenticatePartner } from '../middleware/partnerAuth';
import { dealService } from '../services/dealService';
import { registerDealSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function partnerDealsPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/', async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const deals = await dealService.listForPartner(partnerId);
    return reply.send({ deals });
  });

  fastify.post(
    '/',
    { schema: { body: zodToFastifySchema(registerDealSchema) } },
    async (request, reply) => {
      const partnerId = request.partnerUser!.partnerId;
      const result = await dealService.registerDeal(partnerId, request.body as any, request.partnerUser!.accountId);
      return reply.code(201).send(result);
    }
  );
}
