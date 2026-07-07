import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { partnerService } from '../services/partnerService';
import { getPartnerActivationBlockers } from '../services/partnerApprovalPreconditions';
import { authenticate } from '../middleware/auth';
import { agreementService, AgreementTransitionError } from '../services/agreementService';
import { listPartnerActivity } from '../utils/activityLogger';
import { partnerEmployeeService } from '../services/partnerEmployeeService';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { tierService } from '../services/tierService';
import { businessPlanService } from '../services/businessPlanService';
import { rewardsService } from '../services/rewardsService';
import { accountMappingService } from '../services/accountMappingService';
import { partnerHealthService } from '../services/partnerHealthService';
import {
  createPartnerSchema,
  updatePartnerSchema,
  partnerIdParamsSchema,
  approvePartnerSchema,
  offboardPartnerSchema,
  createBusinessPlanSchema,
  updateBusinessPlanSchema,
  awardRewardPointsSchema,
  assignAccountManagerSchema,
  updatePartnerTagsSchema,
} from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

const createAgreementSchema = z.object({
  agreementType: z.string().min(1).max(50),
  agreementNumber: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  tenantId: z.string().uuid().optional(),
});

const updateAgreementSchema = z.object({
  agreementType: z.string().min(1).max(50).optional(),
  agreementNumber: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  tenantId: z.string().uuid().optional().nullable(),
  documentUrl: z.string().url().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['draft', 'pending_signature', 'signed', 'expired', 'terminated', 'cancelled']).optional(),
});

export async function partnerRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // Get all partners
  fastify.get('/', async (request, reply) => {
    try {
      const partners = await partnerService.getAllPartners(request.query);
      return reply.send(partners);
    } catch (error: any) {
      fastify.log.error('Error fetching partners:', error);
      console.error('Partner service error:', error);
      console.error('Error stack:', error.stack);
      return reply.code(500).send({ 
        error: 'Failed to fetch partners', 
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  fastify.get(
    '/:partnerId/activity',
    {
      schema: {
        params: zodToFastifySchema(partnerIdParamsSchema),
      },
    },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const logs = await listPartnerActivity(partnerId);
      return reply.send({ activity: logs });
    }
  );

  fastify.get(
    '/:partnerId/agreements',
    {
      schema: {
        params: zodToFastifySchema(partnerIdParamsSchema),
      },
    },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const agreements = await agreementService.listForPartner(partnerId);
      return reply.send({ agreements });
    }
  );

  fastify.post(
    '/:partnerId/agreements',
    {
      schema: {
        params: zodToFastifySchema(partnerIdParamsSchema),
        body: zodToFastifySchema(createAgreementSchema),
      },
    },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const body = request.body as z.infer<typeof createAgreementSchema>;
      const agreement = await agreementService.create({
        partnerId,
        tenantId: body.tenantId ?? null,
        agreementType: body.agreementType,
        agreementNumber: body.agreementNumber,
        title: body.title,
        description: body.description ?? null,
        status: 'draft',
      });
      return reply.code(201).send({ agreement });
    }
  );

  fastify.patch(
    '/:partnerId/agreements/:agreementId',
    {
      schema: {
        params: zodToFastifySchema(
          partnerIdParamsSchema.extend({ agreementId: z.string().uuid() })
        ),
        body: zodToFastifySchema(updateAgreementSchema),
      },
    },
    async (request, reply) => {
      const { partnerId, agreementId } = request.params as {
        partnerId: string;
        agreementId: string;
      };
      const body = request.body as z.infer<typeof updateAgreementSchema>;
      try {
        const agreement = await agreementService.updateAgreement(agreementId, partnerId, {
          agreementType: body.agreementType,
          agreementNumber: body.agreementNumber,
          title: body.title,
          description: body.description ?? undefined,
          tenantId: body.tenantId ?? undefined,
          documentUrl: body.documentUrl ?? undefined,
          startDate: body.startDate ?? undefined,
          endDate: body.endDate ?? undefined,
          notes: body.notes ?? undefined,
          status: body.status,
        });
        if (!agreement) {
          return reply.code(404).send({ message: 'Agreement not found' });
        }
        return reply.send({ agreement });
      } catch (error) {
        if (error instanceof AgreementTransitionError) {
          return reply.code(400).send({
            message: `Invalid status transition from ${error.from} to ${error.to}`,
          });
        }
        throw error;
      }
    }
  );

  fastify.patch(
    '/:partnerId/agreements/:agreementId/status',
    {
      schema: {
        params: zodToFastifySchema(
          partnerIdParamsSchema.extend({ agreementId: z.string().uuid() })
        ),
        body: zodToFastifySchema(
          z.object({
            status: z.enum(['cancelled', 'terminated', 'expired']),
            notes: z.string().optional(),
          })
        ),
      },
    },
    async (request, reply) => {
      const { partnerId, agreementId } = request.params as {
        partnerId: string;
        agreementId: string;
      };
      const body = request.body as { status: 'cancelled' | 'terminated' | 'expired'; notes?: string };
      try {
        const agreement = await agreementService.updateStatus(agreementId, partnerId, body.status);
        if (!agreement) {
          return reply.code(404).send({ message: 'Agreement not found' });
        }
        return reply.send({ agreement });
      } catch (error) {
        if (error instanceof AgreementTransitionError) {
          return reply.code(400).send({
            message: `Invalid status transition from ${error.from} to ${error.to}`,
          });
        }
        throw error;
      }
    }
  );

  fastify.delete(
    '/:partnerId/agreements/:agreementId',
    {
      schema: {
        params: zodToFastifySchema(
          partnerIdParamsSchema.extend({ agreementId: z.string().uuid() })
        ),
      },
    },
    async (request, reply) => {
      const { partnerId, agreementId } = request.params as {
        partnerId: string;
        agreementId: string;
      };
      const current = await agreementService.getById(agreementId, partnerId);
      if (!current) {
        return reply.code(404).send({ message: 'Agreement not found' });
      }
      if (current.status === 'signed') {
        return reply.code(400).send({
          message: 'Signed agreements cannot be deleted. Mark as terminated/cancelled instead.',
        });
      }
      await agreementService.deleteAgreement(agreementId, partnerId);
      return reply.code(204).send();
    }
  );

  fastify.get(
    '/:partnerId/activation-readiness',
    {
      schema: {
        params: zodToFastifySchema(partnerIdParamsSchema),
      },
    },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const blockers = await getPartnerActivationBlockers(partnerId);
      return reply.send({ ready: blockers.length === 0, blockers });
    }
  );

  fastify.get(
    '/:partnerId/portal-users',
    {
      schema: {
        params: zodToFastifySchema(partnerIdParamsSchema),
      },
    },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const employees = await partnerEmployeeService.getEmployees(partnerId);
      return reply.send({ employees });
    }
  );

  // ========== TIERS ==========

  fastify.get(
    '/:partnerId/tier-progress',
    { schema: { params: zodToFastifySchema(partnerIdParamsSchema) } },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const progress = await tierService.getTierProgress(partnerId);
      return reply.send(progress);
    }
  );

  fastify.put(
    '/:partnerId/tier',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(partnerIdParamsSchema),
        body: zodToFastifySchema(z.object({ tierCode: z.string().min(1).max(50) })),
      },
    },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const { tierCode } = request.body as { tierCode: string };
      const partner = await tierService.setTierManually(partnerId, tierCode, request.user?.userId);
      return reply.send(partner);
    }
  );

  // ========== TAGS & ACCOUNT MANAGER ==========

  fastify.put(
    '/:partnerId/tags',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(partnerIdParamsSchema),
        body: zodToFastifySchema(updatePartnerTagsSchema),
      },
    },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const partner = await partnerService.updateTags(partnerId, (request.body as { tags: string[] }).tags);
      return reply.send(partner);
    }
  );

  fastify.put(
    '/:partnerId/account-manager',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(partnerIdParamsSchema),
        body: zodToFastifySchema(assignAccountManagerSchema),
      },
    },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const { accountManagerId } = request.body as { accountManagerId: string | null };
      const partner = await partnerService.assignAccountManager(partnerId, accountManagerId);
      return reply.send(partner);
    }
  );

  // ========== BUSINESS PLANS ==========

  fastify.get(
    '/:partnerId/business-plans',
    { schema: { params: zodToFastifySchema(partnerIdParamsSchema) } },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const plans = await businessPlanService.listForPartner(partnerId);
      return reply.send({ plans });
    }
  );

  fastify.post(
    '/:partnerId/business-plans',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(partnerIdParamsSchema),
        body: zodToFastifySchema(createBusinessPlanSchema),
      },
    },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const plan = await businessPlanService.create(partnerId, request.body as any, request.user?.userId);
      return reply.code(201).send({ plan });
    }
  );

  fastify.patch(
    '/:partnerId/business-plans/:planId',
    {
      schema: {
        params: zodToFastifySchema(partnerIdParamsSchema.extend({ planId: z.string().uuid() })),
        body: zodToFastifySchema(updateBusinessPlanSchema),
      },
    },
    async (request, reply) => {
      const { partnerId, planId } = request.params as { partnerId: string; planId: string };
      const plan = await businessPlanService.update(planId, partnerId, request.body as any);
      if (!plan) return reply.code(404).send({ message: 'Plan not found' });
      return reply.send({ plan });
    }
  );

  fastify.delete(
    '/:partnerId/business-plans/:planId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(partnerIdParamsSchema.extend({ planId: z.string().uuid() })),
      },
    },
    async (request, reply) => {
      const { partnerId, planId } = request.params as { partnerId: string; planId: string };
      const deleted = await businessPlanService.delete(planId, partnerId);
      if (!deleted) return reply.code(404).send({ message: 'Plan not found' });
      return reply.code(204).send();
    }
  );

  // ========== REWARD POINTS ==========

  fastify.get(
    '/:partnerId/rewards',
    { schema: { params: zodToFastifySchema(partnerIdParamsSchema) } },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const [balance, transactions] = await Promise.all([
        rewardsService.getBalance(partnerId),
        rewardsService.listTransactions(partnerId),
      ]);
      return reply.send({ balance, transactions });
    }
  );

  fastify.post(
    '/:partnerId/rewards/award',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(partnerIdParamsSchema),
        body: zodToFastifySchema(awardRewardPointsSchema),
      },
    },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const { points, reason } = request.body as { points: number; reason: string };
      const tx = await rewardsService.addPoints(partnerId, points, reason, request.user?.userId);
      return reply.code(201).send({ transaction: tx });
    }
  );

  // ========== ACCOUNT MAPPING & HEALTH ==========

  fastify.get(
    '/:partnerId/account-map',
    { schema: { params: zodToFastifySchema(partnerIdParamsSchema) } },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const map = await accountMappingService.getPartnerAccountMap(partnerId);
      return reply.send({ tenants: map });
    }
  );

  fastify.get(
    '/:partnerId/health-score',
    { schema: { params: zodToFastifySchema(partnerIdParamsSchema) } },
    async (request, reply) => {
      const { partnerId } = request.params as { partnerId: string };
      const health = await partnerHealthService.computeHealthScore(partnerId);
      return reply.send(health);
    }
  );

  fastify.get('/health-scores', async (_request, reply) => {
    const scores = await partnerHealthService.listHealthScores();
    return reply.send({ scores });
  });

  // Get partner by ID
  fastify.get('/:partnerId', {
    schema: {
      params: zodToFastifySchema(partnerIdParamsSchema),
    },
  }, async (request, reply) => {
    const partner = await partnerService.getPartnerById(request.params.partnerId);
    return reply.send(partner);
  });

  // Create partner
  fastify.post('/', {
    schema: {
      body: zodToFastifySchema(createPartnerSchema),
    },
  }, async (request, reply) => {
    const partner = await partnerService.createPartner(request.body, request.user);
    return reply.code(201).send(partner);
  });

  // Update partner
  fastify.put('/:partnerId', {
    schema: {
      params: zodToFastifySchema(partnerIdParamsSchema),
      body: zodToFastifySchema(updatePartnerSchema),
    },
  }, async (request, reply) => {
    const partner = await partnerService.updatePartner(
      request.params.partnerId,
      request.body,
      request.user
    );
    return reply.send(partner);
  });

  // Approve partner
  fastify.post('/:partnerId/approve', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(partnerIdParamsSchema),
      body: zodToFastifySchema(approvePartnerSchema),
    },
  }, async (request, reply) => {
    try {
      await partnerService.approvePartner(
        request.params.partnerId,
        request.body,
        request.user
      );
      return reply.code(204).send();
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; blockers?: string[] };
      if (err?.code === 'PARTNER_APPROVAL_BLOCKED') {
        return reply.code(400).send({
          error: 'Approval blocked',
          message: err.message,
          blockers: err.blockers ?? [],
        });
      }
      throw error;
    }
  });

  // Suspend partner
  fastify.post('/:partnerId/suspend', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(partnerIdParamsSchema),
    },
  }, async (request, reply) => {
    await partnerService.suspendPartner(request.params.partnerId, request.user);
    return reply.code(204).send();
  });

  // Offboard partner — distinct from suspend: starts the data-retention countdown for PII purge.
  fastify.post('/:partnerId/offboard', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(partnerIdParamsSchema),
      body: zodToFastifySchema(offboardPartnerSchema),
    },
  }, async (request, reply) => {
    const partner = await partnerService.offboardPartner(
      request.params.partnerId,
      request.body,
      request.user
    );
    return reply.send(partner);
  });

  // Bulk import partners from CSV
  fastify.post('/import', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
  }, async (request, reply) => {
    const report = await partnerService.importPartnersFromCsv(request, request.user);
    return reply.send(report);
  });
}

