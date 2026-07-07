import { FastifyInstance } from 'fastify';
import { onboardingService } from '../services/onboardingService';
import { supplierOnboardingService } from '../services/supplierOnboardingService';
import { logisticsOnboardingService } from '../services/logisticsOnboardingService';
import { agreementService } from '../services/agreementService';
import { productService } from '../services/productService';
import { supplierService } from '../services/supplierService';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { autoApprovalService } from '../services/autoApprovalService';
import { db } from '../db';
import { partnerAgreements } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logPartnerActivity } from '../utils/activityLogger';
import {
  approveStageSchema,
  rejectStageSchema,
  supplierOnboardingStageSchema,
  partnerOnboardingStageSchema,
  partnerTypeSchema,
  stageSettingUpdateSchema,
  createAutoApprovalRuleSchema,
  updateAutoApprovalRuleSchema,
} from '@partner-portal/common';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';
import { onboardingStageConfigService } from '../services/onboardingStageConfigService';
import { onboardingAnalyticsService } from '../services/onboardingAnalyticsService';
import { tierService } from '../services/tierService';

export async function onboardingRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // ========== PARTNER ONBOARDING ==========
  
  // Get partner onboarding workflow
  fastify.get('/partner/:partnerId', {
    schema: {
      params: zodToFastifySchema(z.object({ partnerId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const workflow = await onboardingService.getWorkflow(request.params.partnerId);
    return reply.send(workflow);
  });

  // Update partner onboarding stage
  fastify.put('/partner/:partnerId/stage', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(z.object({ partnerId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        stage: z.enum([
          'registration', 'service_selection', 'initial_review', 'documentation',
          'verification', 'agreement', 'app_access', 'user_setup', 'training',
          'testing', 'go_live'
        ]),
        status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'skipped']),
        stageData: z.record(z.unknown()).optional(),
        notes: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    try {
      const workflow = await onboardingService.updateStage(
        request.params.partnerId,
        request.body,
        request.user
      );
      await autoApprovalService.maybeAutoApprove(request.params.partnerId);
      await tierService.evaluateAndPromote(request.params.partnerId);
      return reply.send(workflow);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Update failed';
      return reply.code(400).send({ message, details: error.details });
    }
  });

  fastify.post('/partner/:partnerId/stage/:stage/approve', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(
        z.object({
          partnerId: z.string().uuid(),
          stage: partnerOnboardingStageSchema,
        })
      ),
      body: zodToFastifySchema(approveStageSchema),
    },
  }, async (request, reply) => {
    try {
      const workflow = await onboardingService.approveStage(
        request.params.partnerId,
        request.params.stage,
        { type: 'admin', id: request.user?.userId },
        request.body
      );
      await autoApprovalService.maybeAutoApprove(request.params.partnerId);
      await tierService.evaluateAndPromote(request.params.partnerId);
      return reply.send(workflow);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Approve failed';
      return reply.code(400).send({ message, details: error.details });
    }
  });

  fastify.post('/partner/:partnerId/stage/:stage/reject', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(
        z.object({
          partnerId: z.string().uuid(),
          stage: partnerOnboardingStageSchema,
        })
      ),
      body: zodToFastifySchema(rejectStageSchema),
    },
  }, async (request, reply) => {
    try {
      const workflow = await onboardingService.rejectStage(
        request.params.partnerId,
        request.params.stage,
        { type: 'admin', id: request.user?.userId },
        request.body.reason
      );
      return reply.send(workflow);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Reject failed';
      return reply.code(400).send({ message });
    }
  });

  fastify.get('/partner/review-queue', async (_request, reply) => {
    const queue = await onboardingService.getReviewQueue();
    return reply.send({ queue });
  });

  // ========== SUPPLIER ONBOARDING ==========
  
  // Get supplier onboarding workflow
  fastify.get('/supplier/:supplierId', {
    schema: {
      params: zodToFastifySchema(z.object({ supplierId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const workflow = await supplierOnboardingService.getWorkflow(request.params.supplierId);
    return reply.send(workflow);
  });

  // Update supplier onboarding stage
  fastify.put('/supplier/:supplierId/stage', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(z.object({ supplierId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        stage: z.enum([
          'supplier_registration', 'catalog_setup', 'supplier_documentation',
          'supplier_verification', 'supplier_agreement', 'payment_setup',
          'supplier_portal_access', 'supplier_activation'
        ]),
        status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'skipped']),
        stageData: z.record(z.unknown()).optional(),
        notes: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    const workflow = await supplierOnboardingService.updateStage(
      request.params.supplierId,
      { ...request.body, force: (request.body as { force?: boolean }).force },
      request.user
    );
    return reply.send(workflow);
  });

  fastify.post('/supplier/:supplierId/stage/:stage/approve', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(
        z.object({
          supplierId: z.string().uuid(),
          stage: supplierOnboardingStageSchema,
        })
      ),
      body: zodToFastifySchema(approveStageSchema),
    },
  }, async (request, reply) => {
    try {
      const workflow = await supplierOnboardingService.approveStage(
        request.params.supplierId,
        request.params.stage,
        { type: 'admin', id: request.user?.userId },
        request.body
      );
      return reply.send(workflow);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Approve failed';
      return reply.code(400).send({ message, details: error.details });
    }
  });

  fastify.post('/supplier/:supplierId/stage/:stage/reject', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(
        z.object({
          supplierId: z.string().uuid(),
          stage: supplierOnboardingStageSchema,
        })
      ),
      body: zodToFastifySchema(rejectStageSchema),
    },
  }, async (request, reply) => {
    try {
      const workflow = await supplierOnboardingService.rejectStage(
        request.params.supplierId,
        request.params.stage,
        { type: 'admin', id: request.user?.userId },
        request.body.reason
      );
      return reply.send(workflow);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Reject failed';
      return reply.code(400).send({ message });
    }
  });

  fastify.get('/supplier/review-queue', async (_request, reply) => {
    const queue = await supplierOnboardingService.getReviewQueue();
    return reply.send({ queue });
  });

  fastify.post('/supplier/:supplierId/catalog/approve-all', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(z.object({ supplierId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const products = await productService.getSupplierProducts(request.params.supplierId, {
      status: 'pending_approval',
      limit: 500,
    });
    for (const p of products.products) {
      await productService.updateProduct(
        p.productId,
        { status: 'active' },
        request.user
      );
    }
    return reply.send({ approved: products.products.length });
  });

  fastify.post('/supplier/:supplierId/agreement', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(z.object({ supplierId: z.string().uuid() })),
      body: zodToFastifySchema(
        z.object({
          agreementName: z.string().min(1),
          agreementType: z.string().default('supplier'),
          documentUrl: z.string().url().optional(),
        })
      ),
    },
  }, async (request, reply) => {
    const supplier = await supplierService.getSupplierById(request.params.supplierId);
    if (!supplier) {
      return reply.code(404).send({ message: 'Supplier not found' });
    }
    const body = request.body as {
      agreementName: string;
      agreementType?: string;
      documentUrl?: string;
    };
    const agreementNumber = `AGR-SUP-${Date.now()}`;
    const agreement = await agreementService.create({
      partnerId: supplier.partnerId,
      agreementType: body.agreementType || 'supplier',
      agreementNumber,
      title: body.agreementName,
      documentUrl: body.documentUrl,
      status: 'pending_signature',
    });
    return reply.code(201).send({ agreement });
  });

  fastify.post('/supplier/:supplierId/agreement/:agreementId/countersign', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(
        z.object({
          supplierId: z.string().uuid(),
          agreementId: z.string().uuid(),
        })
      ),
    },
  }, async (request, reply) => {
    const supplier = await supplierService.getSupplierById(request.params.supplierId);
    if (!supplier) {
      return reply.code(404).send({ message: 'Supplier not found' });
    }
    const agreement = await agreementService.getById(request.params.agreementId);
    if (!agreement || agreement.partnerId !== supplier.partnerId) {
      return reply.code(404).send({ message: 'Agreement not found' });
    }
    const [updated] = await db
      .update(partnerAgreements)
      .set({
        status: 'signed',
        signedByPlatform: request.user?.userId,
        platformSignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(partnerAgreements.agreementId, request.params.agreementId))
      .returning();

    if (updated) {
      await logPartnerActivity({
        partnerId: updated.partnerId,
        activityType: 'agreement_signed',
        activityDescription: `Agreement "${updated.title}" countersigned by platform staff.`,
        performedBy: request.user!.userId!,
        performedByType: 'platform_admin',
        metadata: { agreementId: updated.agreementId },
      });
    }

    return reply.send({ agreement: updated });
  });

  // ========== LOGISTICS ONBOARDING ==========
  
  // Get logistics onboarding workflow
  fastify.get('/logistics/:logisticsId', {
    schema: {
      params: zodToFastifySchema(z.object({ logisticsId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const workflow = await logisticsOnboardingService.getWorkflow(request.params.logisticsId);
    return reply.send(workflow);
  });

  // Update logistics onboarding stage
  fastify.put('/logistics/:logisticsId/stage', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(z.object({ logisticsId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        stage: z.enum([
          'logistics_registration', 'fleet_setup', 'logistics_documentation',
          'logistics_verification', 'logistics_agreement', 'api_integration',
          'logistics_portal_access', 'logistics_testing', 'logistics_activation'
        ]),
        status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'skipped']),
        stageData: z.record(z.unknown()).optional(),
        notes: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    const workflow = await logisticsOnboardingService.updateStage(
      request.params.logisticsId,
      request.body,
      request.user
    );
    return reply.send(workflow);
  });

  // ========== STAGE CONFIGURATION (admin-configurable onboarding workflow) ==========

  fastify.get('/stage-config/:partnerType', {
    schema: { params: zodToFastifySchema(z.object({ partnerType: partnerTypeSchema })) },
  }, async (request, reply) => {
    const stages = await onboardingStageConfigService.listForAdmin(
      (request.params as { partnerType: string }).partnerType
    );
    return reply.send({ stages });
  });

  fastify.put('/stage-config/:partnerType/:stageCode', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(
        z.object({ partnerType: partnerTypeSchema, stageCode: partnerOnboardingStageSchema })
      ),
      body: zodToFastifySchema(stageSettingUpdateSchema),
    },
  }, async (request, reply) => {
    const { partnerType, stageCode } = request.params as {
      partnerType: string;
      stageCode: any;
    };
    const setting = await onboardingStageConfigService.upsertSetting(
      partnerType,
      stageCode,
      request.body as Record<string, unknown>,
      request.user?.userId
    );
    return reply.send({ setting });
  });

  // ========== AUTO-APPROVAL RULES ==========

  fastify.get('/auto-approval-rules', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
  }, async (_request, reply) => {
    const rules = await autoApprovalService.listRules();
    return reply.send({ rules });
  });

  fastify.post('/auto-approval-rules', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: { body: zodToFastifySchema(createAutoApprovalRuleSchema) },
  }, async (request, reply) => {
    const rule = await autoApprovalService.createRule(
      request.body as any,
      request.user?.userId
    );
    return reply.code(201).send({ rule });
  });

  fastify.patch('/auto-approval-rules/:ruleId', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(z.object({ ruleId: z.string().uuid() })),
      body: zodToFastifySchema(updateAutoApprovalRuleSchema),
    },
  }, async (request, reply) => {
    const rule = await autoApprovalService.updateRule(
      (request.params as { ruleId: string }).ruleId,
      request.body as any
    );
    if (!rule) return reply.code(404).send({ message: 'Rule not found' });
    return reply.send({ rule });
  });

  fastify.delete('/auto-approval-rules/:ruleId', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: { params: zodToFastifySchema(z.object({ ruleId: z.string().uuid() })) },
  }, async (request, reply) => {
    await autoApprovalService.deleteRule((request.params as { ruleId: string }).ruleId);
    return reply.code(204).send();
  });

  // ========== ONBOARDING ANALYTICS ==========

  fastify.get('/analytics', async (_request, reply) => {
    const analytics = await onboardingAnalyticsService.getAnalytics();
    return reply.send(analytics);
  });
}

