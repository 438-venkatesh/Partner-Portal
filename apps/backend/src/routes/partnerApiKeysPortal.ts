import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticatePartner } from '../middleware/partnerAuth';
import { requirePartnerRole } from '../middleware/requireRole';
import { apiKeyService } from '../services/apiKeyService';
import { zodToFastifySchema } from '../utils/schemaConverter';

const revokeParams = z.object({ keyId: z.string().uuid() });

export async function partnerApiKeysPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/', async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });
    const keys = await apiKeyService.listKeys(partnerId);
    return reply.send({ keys });
  });

  fastify.post(
    '/',
    {
      preHandler: [requirePartnerRole('admin')],
    },
    async (request, reply) => {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });
      const created = await apiKeyService.createKey(partnerId);
      return reply.code(201).send({
        keyId: created.row?.keyId,
        keyPrefix: created.row?.keyPrefix,
        /** Shown only at creation — store securely */
        rawKey: created.rawKey,
      });
    }
  );

  fastify.delete(
    '/:keyId',
    {
      schema: { params: zodToFastifySchema(revokeParams) },
      preHandler: [requirePartnerRole('admin')],
    },
    async (request, reply) => {
      const partnerId = request.partnerUser?.partnerId;
      const { keyId } = request.params as z.infer<typeof revokeParams>;
      if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });
      const row = await apiKeyService.revokeKey(partnerId, keyId);
      if (!row) return reply.code(404).send({ error: 'Not found' });
      return reply.send({ ok: true });
    }
  );
}
