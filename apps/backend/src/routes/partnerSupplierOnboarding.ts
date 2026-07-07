import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticatePartner } from '../middleware/partnerAuth';
import { requireSupplierPartner } from '../middleware/requireSupplierPartner';
import { supplierOnboardingService } from '../services/supplierOnboardingService';
import { zodToFastifySchema } from '../utils/schemaConverter';
import {
  saveStageDraftSchema,
  submitStageSchema,
  supplierOnboardingStageSchema,
  updateSupplierProfileSchema,
  portalTrainingChecklistSchema,
} from '@partner-portal/common';

export async function partnerSupplierOnboardingRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);
  fastify.addHook('onRequest', requireSupplierPartner);

  fastify.get('/workflow', async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    try {
      const ctx = await supplierOnboardingService.getSupplierContext(partnerId);
      return reply.send({
        workflow: ctx.workflow,
        supplier: ctx.supplier,
        supplierId: ctx.supplierId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load workflow';
      return reply.code(400).send({ message });
    }
  });

  fastify.post('/ensure-agreement', async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    try {
      const agreement = await supplierOnboardingService.ensureSupplierAgreementForPartnerIfNeeded(
        partnerId
      );
      if (!agreement) {
        return reply.code(400).send({
          message:
            'Agreement is not ready yet. Complete platform verification first, or contact operations.',
        });
      }
      return reply.send({ agreement });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to issue agreement';
      return reply.code(400).send({ message });
    }
  });

  fastify.get('/supplier', async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const ctx = await supplierOnboardingService.getSupplierContext(partnerId);
    return reply.send({ supplier: ctx.supplier });
  });

  fastify.patch('/profile', {
    schema: { body: zodToFastifySchema(updateSupplierProfileSchema) },
  }, async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    try {
      const supplier = await supplierOnboardingService.updateSupplierProfile(
        partnerId,
        request.body as z.infer<typeof updateSupplierProfileSchema>
      );
      return reply.send({ supplier });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      return reply.code(400).send({ message });
    }
  });

  fastify.put('/stage/draft', {
    schema: { body: zodToFastifySchema(saveStageDraftSchema) },
  }, async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const body = request.body as z.infer<typeof saveStageDraftSchema>;
    try {
      const ctx = await supplierOnboardingService.getSupplierContext(partnerId);
      const workflow = await supplierOnboardingService.saveStageDraft(
        ctx.supplierId,
        body.stage,
        body.payload || {},
        { type: 'partner' },
        partnerId
      );
      return reply.send(workflow);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      const details = (error as { details?: string[] }).details;
      return reply.code(400).send({ message, details });
    }
  });

  fastify.post('/stage/submit', {
    schema: { body: zodToFastifySchema(submitStageSchema) },
  }, async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const accountId = request.partnerUser!.accountId;
    const body = request.body as z.infer<typeof submitStageSchema>;
    try {
      const ctx = await supplierOnboardingService.getSupplierContext(partnerId);
      const workflow = await supplierOnboardingService.submitStage(ctx.supplierId, body.stage, {
        type: 'partner',
        partnerId,
        accountId,
      });
      return reply.send(workflow);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Submit failed';
      const details = error.details;
      return reply.code(400).send({ message, details });
    }
  });

  fastify.put('/stage/:stage/checklist', {
    schema: {
      params: zodToFastifySchema(z.object({ stage: supplierOnboardingStageSchema })),
      body: zodToFastifySchema(portalTrainingChecklistSchema),
    },
  }, async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const { stage } = request.params as { stage: z.infer<typeof supplierOnboardingStageSchema> };
    if (stage !== 'supplier_portal_access') {
      return reply.code(400).send({ message: 'Checklist only applies to portal access stage' });
    }
    try {
      const ctx = await supplierOnboardingService.getSupplierContext(partnerId);
      const workflow = await supplierOnboardingService.saveStageDraft(
        ctx.supplierId,
        stage,
        request.body as Record<string, unknown>,
        { type: 'partner' },
        partnerId
      );
      return reply.send(workflow);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      return reply.code(400).send({ message });
    }
  });
}
