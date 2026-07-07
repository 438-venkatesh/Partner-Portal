import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { partnerService } from '../services/partnerService';
import { getPartnerActivationBlockers } from '../services/partnerApprovalPreconditions';
import { authenticate } from '../middleware/auth';
import { agreementService, AgreementTransitionError } from '../services/agreementService';
import { listPartnerActivity } from '../utils/activityLogger';
import { partnerEmployeeService } from '../services/partnerEmployeeService';
import {
  createPartnerSchema,
  updatePartnerSchema,
  partnerIdParamsSchema,
  approvePartnerSchema,
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
    schema: {
      params: zodToFastifySchema(partnerIdParamsSchema),
    },
  }, async (request, reply) => {
    await partnerService.suspendPartner(request.params.partnerId, request.user);
    return reply.code(204).send();
  });
}

