import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { dataPrivacyService } from '../services/dataPrivacyService';
import { reviewErasureRequestSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

/** Admin queue for partner-submitted GDPR erasure requests. */
export async function dataPrivacyRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get(
    '/erasure-requests',
    { schema: { querystring: zodToFastifySchema(z.object({ status: z.string().optional() })) } },
    async (request, reply) => {
      const { status } = request.query as { status?: string };
      const requests = await dataPrivacyService.listAllErasureRequests(status);
      return reply.send({ requests });
    }
  );

  fastify.post(
    '/erasure-requests/:requestId/review',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ requestId: z.string().uuid() })),
        body: zodToFastifySchema(reviewErasureRequestSchema),
      },
    },
    async (request, reply) => {
      const { requestId } = request.params as { requestId: string };
      const { approved, rejectionReason } = request.body as { approved: boolean; rejectionReason?: string };
      try {
        const reviewed = await dataPrivacyService.reviewErasureRequest(
          requestId,
          approved,
          request.user!.userId!,
          rejectionReason
        );
        return reply.send({ request: reviewed });
      } catch (error: any) {
        return reply.code(400).send({ message: error.message });
      }
    }
  );
}
