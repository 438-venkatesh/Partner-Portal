import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticatePartner } from '../middleware/partnerAuth';
import { comarketingService } from '../services/comarketingService';
import {
  createCoMarketingPageSchema,
  updateCoMarketingPageSchema,
  createReferralLinkSchema,
  updateReferralLinkSchema,
} from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function partnerComarketingPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/eligible-assets', async (_request, reply) => {
    const assets = await comarketingService.listEligibleAssets();
    return reply.send({ assets });
  });

  // ---- pages ----
  fastify.get('/pages', async (request, reply) => {
    const pages = await comarketingService.listPagesForPartner(request.partnerUser!.partnerId);
    return reply.send({ pages });
  });

  fastify.post(
    '/pages',
    { schema: { body: zodToFastifySchema(createCoMarketingPageSchema) } },
    async (request, reply) => {
      try {
        const page = await comarketingService.createPage(request.partnerUser!.partnerId, request.body as any);
        return reply.code(201).send({ page });
      } catch (error: any) {
        return reply.code(400).send({ message: error.message });
      }
    }
  );

  fastify.patch(
    '/pages/:pageId',
    {
      schema: {
        params: zodToFastifySchema(z.object({ pageId: z.string().uuid() })),
        body: zodToFastifySchema(updateCoMarketingPageSchema),
      },
    },
    async (request, reply) => {
      try {
        const page = await comarketingService.updatePage(
          (request.params as { pageId: string }).pageId,
          request.partnerUser!.partnerId,
          request.body as any
        );
        return reply.send({ page });
      } catch (error: any) {
        return reply.code(404).send({ message: error.message });
      }
    }
  );

  fastify.delete(
    '/pages/:pageId',
    { schema: { params: zodToFastifySchema(z.object({ pageId: z.string().uuid() })) } },
    async (request, reply) => {
      try {
        await comarketingService.deletePage((request.params as { pageId: string }).pageId, request.partnerUser!.partnerId);
        return reply.code(204).send();
      } catch (error: any) {
        return reply.code(404).send({ message: error.message });
      }
    }
  );

  // ---- referral / campaign links ----
  fastify.get('/links', async (request, reply) => {
    const links = await comarketingService.listLinksForPartner(request.partnerUser!.partnerId);
    return reply.send({ links });
  });

  fastify.post(
    '/links',
    { schema: { body: zodToFastifySchema(createReferralLinkSchema) } },
    async (request, reply) => {
      try {
        const link = await comarketingService.createLink(request.partnerUser!.partnerId, request.body as any);
        return reply.code(201).send({ link });
      } catch (error: any) {
        return reply.code(400).send({ message: error.message });
      }
    }
  );

  fastify.patch(
    '/links/:linkId',
    {
      schema: {
        params: zodToFastifySchema(z.object({ linkId: z.string().uuid() })),
        body: zodToFastifySchema(updateReferralLinkSchema),
      },
    },
    async (request, reply) => {
      try {
        const link = await comarketingService.updateLink(
          (request.params as { linkId: string }).linkId,
          request.partnerUser!.partnerId,
          request.body as any
        );
        return reply.send({ link });
      } catch (error: any) {
        return reply.code(404).send({ message: error.message });
      }
    }
  );

  fastify.delete(
    '/links/:linkId',
    { schema: { params: zodToFastifySchema(z.object({ linkId: z.string().uuid() })) } },
    async (request, reply) => {
      try {
        await comarketingService.deleteLink((request.params as { linkId: string }).linkId, request.partnerUser!.partnerId);
        return reply.code(204).send();
      } catch (error: any) {
        return reply.code(404).send({ message: error.message });
      }
    }
  );
}
