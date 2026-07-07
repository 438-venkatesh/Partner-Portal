import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { accountMappingService } from '../services/accountMappingService';

export async function accountMappingRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/overlaps', async (_request, reply) => {
    const overlaps = await accountMappingService.listOverlaps();
    return reply.send({ overlaps });
  });
}
