import { FastifyInstance } from 'fastify';
import { authenticatePartner } from '../middleware/partnerAuth';
import { commissionService } from '../services/commissionService';
import { incentiveService } from '../services/incentiveService';

export async function partnerCommissionsPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/', async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const [records, balance] = await Promise.all([
      commissionService.listForPartner(partnerId),
      commissionService.getPartnerBalance(partnerId),
    ]);
    return reply.send({ records, balance });
  });

  fastify.get('/challenges', async (request, reply) => {
    const challenges = await incentiveService.listForPartner(request.partnerUser!.partnerId);
    return reply.send({ challenges });
  });
}
