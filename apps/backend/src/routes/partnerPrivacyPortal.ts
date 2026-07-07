import { FastifyInstance } from 'fastify';
import { authenticatePartner } from '../middleware/partnerAuth';
import { dataPrivacyService } from '../services/dataPrivacyService';
import { createErasureRequestSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

/** Partner self-service data export and GDPR erasure requests. */
export async function partnerPrivacyPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/export', async (request, reply) => {
    const bundle = await dataPrivacyService.exportPartnerData(request.partnerUser!.partnerId);
    return reply
      .header('Content-Disposition', 'attachment; filename="partner-data-export.json"')
      .send(bundle);
  });

  fastify.get('/erasure-requests', async (request, reply) => {
    const requests = await dataPrivacyService.listErasureRequestsForPartner(request.partnerUser!.partnerId);
    return reply.send({ requests });
  });

  fastify.post(
    '/erasure-requests',
    { schema: { body: zodToFastifySchema(createErasureRequestSchema) } },
    async (request, reply) => {
      const created = await dataPrivacyService.createErasureRequest(
        request.partnerUser!.partnerId,
        request.partnerUser!.accountId,
        request.body as any
      );
      return reply.code(201).send({ request: created });
    }
  );
}
