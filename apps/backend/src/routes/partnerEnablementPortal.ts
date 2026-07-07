import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticatePartner } from '../middleware/partnerAuth';
import { playbookService } from '../services/playbookService';
import { assetLibraryService } from '../services/assetLibraryService';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function partnerEnablementPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get(
    '/playbooks',
    { schema: { querystring: zodToFastifySchema(z.object({ dealStage: z.string().optional() })) } },
    async (request, reply) => {
      const { dealStage } = request.query as { dealStage?: string };
      const playbooks = await playbookService.listForPartner(request.partnerUser!.partnerId, dealStage);
      return reply.send({ playbooks });
    }
  );

  fastify.get('/assets', async (request, reply) => {
    const assets = await assetLibraryService.listForPartner(request.partnerUser!.partnerId);
    return reply.send({ assets });
  });

  fastify.post(
    '/assets/:assetId/download',
    { schema: { params: zodToFastifySchema(z.object({ assetId: z.string().uuid() })) } },
    async (request, reply) => {
      const asset = await assetLibraryService.recordDownload((request.params as { assetId: string }).assetId);
      if (!asset) return reply.code(404).send({ message: 'Asset not found' });
      return reply.send({ asset });
    }
  );
}
