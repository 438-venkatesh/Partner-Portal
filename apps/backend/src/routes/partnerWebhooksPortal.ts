import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticatePartner } from '../middleware/partnerAuth';
import { requirePartnerRole } from '../middleware/requireRole';
import { webhookService } from '../services/webhookService';
import { webhookDispatcher } from '../services/webhookDispatcher';
import { zodToFastifySchema } from '../utils/schemaConverter';

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

const idParams = z.object({ webhookId: z.string().uuid() });

export async function partnerWebhooksPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/', async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });
    const hooks = await webhookService.listWebhooks(partnerId);
    return reply.send({ webhooks: hooks });
  });

  fastify.post(
    '/',
    {
      schema: { body: zodToFastifySchema(createWebhookSchema) },
      preHandler: [requirePartnerRole('admin')],
    },
    async (request, reply) => {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });
      const body = request.body as z.infer<typeof createWebhookSchema>;
      const { row, secret } = await webhookService.createWebhook(partnerId, body.url, body.events);
      return reply.code(201).send({
        webhook: row,
        secret,
      });
    }
  );

  fastify.delete(
    '/:webhookId',
    {
      schema: { params: zodToFastifySchema(idParams) },
      preHandler: [requirePartnerRole('admin')],
    },
    async (request, reply) => {
      const partnerId = request.partnerUser?.partnerId;
      const { webhookId } = request.params as z.infer<typeof idParams>;
      if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });
      await webhookService.deleteWebhook(partnerId, webhookId);
      return reply.send({ ok: true });
    }
  );

  fastify.post(
    '/:webhookId/test',
    {
      schema: { params: zodToFastifySchema(idParams) },
      preHandler: [requirePartnerRole('admin')],
    },
    async (request, reply) => {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });
      await webhookDispatcher.dispatch(partnerId, 'test', { message: 'Hello from Partner Portal' });
      return reply.send({ ok: true });
    }
  );
}
