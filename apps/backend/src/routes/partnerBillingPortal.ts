import { FastifyInstance } from 'fastify';
import { authenticatePartner } from '../middleware/partnerAuth';
import { billingService } from '../services/billingService';

export async function partnerBillingPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/subscription', async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });
    const sub = await billingService.getPartnerSubscription(partnerId);
    return reply.send({ subscription: sub });
  });

  fastify.get('/invoices', async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });
    const invoices = await billingService.listInvoicesForPartner(partnerId);
    return reply.send({ invoices });
  });
}
