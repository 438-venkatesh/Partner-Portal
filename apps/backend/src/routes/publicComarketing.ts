import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { comarketingService } from '../services/comarketingService';
import { publicLeadCaptureSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';
import { routeRateLimitPublicSubmit } from '../config/rateLimit';

/**
 * Public, unauthenticated surface for partner-authored microsites and referral links —
 * only ever exposes fields a prospect landing on a co-branded page should see.
 */
export async function publicComarketingRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/pages/:slug',
    { schema: { params: zodToFastifySchema(z.object({ slug: z.string() })) } },
    async (request, reply) => {
      const content = await comarketingService.getPublicPage((request.params as { slug: string }).slug);
      if (!content) return reply.code(404).send({ message: 'Page not found' });
      return reply.send(content);
    }
  );

  fastify.post(
    '/pages/:slug/leads',
    {
      ...routeRateLimitPublicSubmit,
      schema: {
        params: zodToFastifySchema(z.object({ slug: z.string() })),
        body: zodToFastifySchema(publicLeadCaptureSchema),
      },
    },
    async (request, reply) => {
      try {
        const result = await comarketingService.submitPageLead(
          (request.params as { slug: string }).slug,
          request.body as any
        );
        return reply.code(201).send(result);
      } catch (error: any) {
        return reply.code(400).send({ message: error.message });
      }
    }
  );

  fastify.get(
    '/r/:code',
    { schema: { params: zodToFastifySchema(z.object({ code: z.string() })) } },
    async (request, reply) => {
      const target = await comarketingService.resolveRedirect((request.params as { code: string }).code);
      if (!target) return reply.code(404).send({ message: 'Link not found' });
      return reply.redirect(target);
    }
  );
}
