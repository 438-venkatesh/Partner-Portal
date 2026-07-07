import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { comarketingService } from '../services/comarketingService';

/** Admin oversight of partner-authored co-marketing pages and referral/campaign links. */
export async function comarketingRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/pages', async (_request, reply) => {
    const pages = await comarketingService.listAllPages();
    return reply.send({ pages });
  });

  fastify.get('/links', async (_request, reply) => {
    const links = await comarketingService.listAllLinks();
    return reply.send({ links });
  });
}
