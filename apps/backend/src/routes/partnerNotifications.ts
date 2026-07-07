import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticatePartner } from '../middleware/partnerAuth';
import { notificationService } from '../services/notificationService';
import { zodToFastifySchema } from '../utils/schemaConverter';

const idParam = z.object({
  id: z.string().uuid(),
});

export async function partnerNotificationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/', async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    const userId = request.partnerUser?.accountId;
    if (!partnerId || !userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const list = await notificationService.listForUser(partnerId, userId);
    const unread = await notificationService.unreadCount(partnerId, userId);
    return reply.send({ notifications: list, unreadCount: unread });
  });

  fastify.get('/unread-count', async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    const userId = request.partnerUser?.accountId;
    if (!partnerId || !userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const unread = await notificationService.unreadCount(partnerId, userId);
    return reply.send({ unreadCount: unread });
  });

  fastify.patch(
    '/:id/read',
    {
      schema: {
        params: zodToFastifySchema(idParam),
      },
    },
    async (request, reply) => {
      const partnerId = request.partnerUser?.partnerId;
      const userId = request.partnerUser?.accountId;
      if (!partnerId || !userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const { id } = request.params as z.infer<typeof idParam>;
      const updated = await notificationService.markRead(id, partnerId, userId);
      if (!updated) {
        return reply.code(404).send({ error: 'Not found' });
      }
      return reply.send({ notification: updated });
    }
  );
}
