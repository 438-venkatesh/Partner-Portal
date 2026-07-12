import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { commissionService } from '../services/commissionService';
import { incentiveService } from '../services/incentiveService';
import {
  createCommissionPlanSchema,
  updateCommissionPlanSchema,
  manualCommissionAdjustmentSchema,
  markCommissionsPaidSchema,
  createIncentiveChallengeSchema,
  updateIncentiveChallengeSchema,
} from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';
import { logPlatformAction } from '../utils/platformAuditLogger';

export async function commissionRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // ---- plans ----
  fastify.get('/plans', async (_request, reply) => {
    const plans = await commissionService.listPlans();
    return reply.send({ plans });
  });

  fastify.post(
    '/plans',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(createCommissionPlanSchema) },
    },
    async (request, reply) => {
      const plan = await commissionService.createPlan(request.body as any);
      await logPlatformAction({
        actorId: request.user!.userId!,
        actorEmail: request.user!.email,
        action: 'commission_plan_created',
        entityType: 'commission_plan',
        entityId: plan.planId,
        metadata: { name: plan.name },
        ipAddress: request.ip,
      });
      return reply.code(201).send({ plan });
    }
  );

  fastify.patch(
    '/plans/:planId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ planId: z.string().uuid() })),
        body: zodToFastifySchema(updateCommissionPlanSchema),
      },
    },
    async (request, reply) => {
      const plan = await commissionService.updatePlan((request.params as { planId: string }).planId, request.body as any);
      if (!plan) return reply.code(404).send({ message: 'Plan not found' });
      await logPlatformAction({
        actorId: request.user!.userId!,
        actorEmail: request.user!.email,
        action: 'commission_plan_updated',
        entityType: 'commission_plan',
        entityId: plan.planId,
        metadata: request.body as Record<string, unknown>,
        ipAddress: request.ip,
      });
      return reply.send({ plan });
    }
  );

  fastify.delete(
    '/plans/:planId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ planId: z.string().uuid() })) },
    },
    async (request, reply) => {
      await commissionService.deletePlan((request.params as { planId: string }).planId);
      return reply.code(204).send();
    }
  );

  // ---- records / payouts ----
  fastify.get('/records', async (request, reply) => {
    const { status } = request.query as { status?: string };
    const records = await commissionService.listAll({ status });
    return reply.send({ records });
  });

  fastify.post(
    '/records/:partnerId/adjust',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ partnerId: z.string().uuid() })),
        body: zodToFastifySchema(manualCommissionAdjustmentSchema),
      },
    },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const { amount, description } = request.body as { amount: number; description: string };
      const record = await commissionService.addManualAdjustment(partnerId, amount, description, request.user?.userId);
      return reply.code(201).send({ record });
    }
  );

  fastify.post(
    '/records/:recordId/approve',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ recordId: z.string().uuid() })) },
    },
    async (request, reply) => {
      const record = await commissionService.approve((request.params as { recordId: string }).recordId, request.user!.userId!);
      return reply.send({ record });
    }
  );

  fastify.post(
    '/records/mark-paid',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(markCommissionsPaidSchema) },
    },
    async (request, reply) => {
      const { recordIds, reference } = request.body as { recordIds: string[]; reference: string };
      const records = await commissionService.markPaid(recordIds, reference);
      return reply.send({ records });
    }
  );

  // ---- incentive challenges ----
  fastify.get('/challenges', async (_request, reply) => {
    const challenges = await incentiveService.listChallenges();
    return reply.send({ challenges });
  });

  fastify.post(
    '/challenges',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(createIncentiveChallengeSchema) },
    },
    async (request, reply) => {
      const challenge = await incentiveService.createChallenge(request.body as any);
      return reply.code(201).send({ challenge });
    }
  );

  fastify.patch(
    '/challenges/:challengeId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ challengeId: z.string().uuid() })),
        body: zodToFastifySchema(updateIncentiveChallengeSchema),
      },
    },
    async (request, reply) => {
      const challenge = await incentiveService.updateChallenge(
        (request.params as { challengeId: string }).challengeId,
        request.body as any
      );
      if (!challenge) return reply.code(404).send({ message: 'Challenge not found' });
      return reply.send({ challenge });
    }
  );

  fastify.delete(
    '/challenges/:challengeId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ challengeId: z.string().uuid() })) },
    },
    async (request, reply) => {
      await incentiveService.deleteChallenge((request.params as { challengeId: string }).challengeId);
      return reply.code(204).send();
    }
  );
}
