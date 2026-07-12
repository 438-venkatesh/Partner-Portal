import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { zodToFastifySchema } from '../utils/schemaConverter';
import { customFieldService } from '../services/customFieldService';
import { partnerService } from '../services/partnerService';
import { documentService } from '../services/documentService';
import { tierService } from '../services/tierService';
import { autoSuspendService } from '../services/autoSuspendService';
import { logPlatformAction } from '../utils/platformAuditLogger';
import {
  createCustomFieldDefinitionSchema,
  updateCustomFieldDefinitionSchema,
  bulkPartnerActionSchema,
  bulkDocumentVerifySchema,
} from '@partner-portal/common';

export async function adminGovernanceRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // ---- custom field definitions ----
  fastify.get('/custom-fields', async (request, reply) => {
    const { entityType } = request.query as { entityType?: string };
    const fields = await customFieldService.listDefinitions(entityType);
    return reply.send({ fields });
  });

  fastify.post(
    '/custom-fields',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(createCustomFieldDefinitionSchema) },
    },
    async (request, reply) => {
      try {
        const field = await customFieldService.createDefinition(request.body as any);
        await logPlatformAction({
          actorId: request.user!.userId!,
          actorEmail: request.user!.email,
          action: 'custom_field_created',
          entityType: 'custom_field_definition',
          entityId: field.fieldId,
          metadata: { fieldKey: field.fieldKey, label: field.label },
          ipAddress: request.ip,
        });
        return reply.code(201).send({ field });
      } catch (e: any) {
        return reply.code(400).send({ message: e.message || 'Could not create field' });
      }
    }
  );

  fastify.patch(
    '/custom-fields/:fieldId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ fieldId: z.string().uuid() })),
        body: zodToFastifySchema(updateCustomFieldDefinitionSchema),
      },
    },
    async (request, reply) => {
      const { fieldId } = request.params as { fieldId: string };
      const field = await customFieldService.updateDefinition(fieldId, request.body as any);
      if (!field) return reply.code(404).send({ message: 'Field not found' });
      await logPlatformAction({
        actorId: request.user!.userId!,
        actorEmail: request.user!.email,
        action: 'custom_field_updated',
        entityType: 'custom_field_definition',
        entityId: fieldId,
        metadata: request.body as Record<string, unknown>,
        ipAddress: request.ip,
      });
      return reply.send({ field });
    }
  );

  fastify.delete(
    '/custom-fields/:fieldId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ fieldId: z.string().uuid() })) },
    },
    async (request, reply) => {
      await customFieldService.deleteDefinition((request.params as { fieldId: string }).fieldId);
      return reply.code(204).send();
    }
  );

  // Set a custom field's value on a specific partner (writes into partners.metadata)
  fastify.put(
    '/custom-fields/partners/:partnerId/:fieldKey',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ partnerId: z.string().uuid(), fieldKey: z.string() })),
        body: zodToFastifySchema(z.object({ value: z.unknown() })),
      },
    },
    async (request, reply) => {
      const { partnerId, fieldKey } = request.params as { partnerId: string; fieldKey: string };
      const { value } = request.body as { value: unknown };
      try {
        const partner = await customFieldService.setPartnerFieldValue(partnerId, fieldKey, value);
        return reply.send({ partner });
      } catch (e: any) {
        return reply.code(400).send({ message: e.message || 'Could not set field value' });
      }
    }
  );

  // ---- bulk admin actions ----
  fastify.post(
    '/bulk/partners',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(bulkPartnerActionSchema) },
    },
    async (request, reply) => {
      const { partnerIds, action } = request.body as {
        partnerIds: string[];
        action: 'approve' | 'suspend' | 'reactivate';
      };

      const results: { partnerId: string; ok: boolean; message?: string }[] = [];
      for (const partnerId of partnerIds) {
        try {
          if (action === 'suspend') {
            await partnerService.suspendPartner(partnerId, request.user);
          } else {
            await partnerService.approvePartner(partnerId, { approved: true }, request.user);
          }
          results.push({ partnerId, ok: true });
        } catch (e: any) {
          results.push({ partnerId, ok: false, message: e.message || 'Failed' });
        }
      }

      await logPlatformAction({
        actorId: request.user!.userId!,
        actorEmail: request.user!.email,
        action: 'bulk_partner_action',
        entityType: 'partner',
        metadata: { action, partnerIds, succeeded: results.filter((r) => r.ok).length },
        ipAddress: request.ip,
      });

      return reply.send({ results });
    }
  );

  fastify.post(
    '/bulk/documents/verify',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(bulkDocumentVerifySchema) },
    },
    async (request, reply) => {
      const { documentIds, verified, notes } = request.body as {
        documentIds: string[];
        verified: boolean;
        notes?: string;
      };

      const results: { documentId: string; ok: boolean; message?: string }[] = [];
      for (const documentId of documentIds) {
        try {
          const document = await documentService.verifyDocument(documentId, { verified, notes }, request.user!);
          await tierService.evaluateAndPromote(document.partnerId);
          results.push({ documentId, ok: true });
        } catch (e: any) {
          results.push({ documentId, ok: false, message: e.message || 'Failed' });
        }
      }

      await logPlatformAction({
        actorId: request.user!.userId!,
        actorEmail: request.user!.email,
        action: 'bulk_document_action',
        entityType: 'partner_document',
        metadata: { verified, documentIds, succeeded: results.filter((r) => r.ok).length },
        ipAddress: request.ip,
      });

      return reply.send({ results });
    }
  );

  // ---- auto-suspend rules (inactive-partner automation) ----
  fastify.get('/auto-suspend-rules', async (_request, reply) => {
    const rules = await autoSuspendService.listRules();
    return reply.send({ rules });
  });

  fastify.post(
    '/auto-suspend-rules',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        body: zodToFastifySchema(
          z.object({
            name: z.string().min(1).max(200),
            inactivityDays: z.number().int().min(1).max(3650).optional(),
            autoSuspend: z.boolean().optional(),
            isActive: z.boolean().optional(),
          })
        ),
      },
    },
    async (request, reply) => {
      const rule = await autoSuspendService.createRule(request.body as any);
      return reply.code(201).send({ rule });
    }
  );

  fastify.patch(
    '/auto-suspend-rules/:ruleId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ ruleId: z.string().uuid() })),
        body: zodToFastifySchema(
          z.object({
            name: z.string().min(1).max(200).optional(),
            inactivityDays: z.number().int().min(1).max(3650).optional(),
            autoSuspend: z.boolean().optional(),
            isActive: z.boolean().optional(),
          })
        ),
      },
    },
    async (request, reply) => {
      const { ruleId } = request.params as { ruleId: string };
      const rule = await autoSuspendService.updateRule(ruleId, request.body as any);
      if (!rule) return reply.code(404).send({ message: 'Rule not found' });
      return reply.send({ rule });
    }
  );

  fastify.delete(
    '/auto-suspend-rules/:ruleId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ ruleId: z.string().uuid() })) },
    },
    async (request, reply) => {
      await autoSuspendService.deleteRule((request.params as { ruleId: string }).ruleId);
      return reply.code(204).send();
    }
  );

  fastify.post(
    '/auto-suspend-rules/run',
    { preHandler: requireOperationsDbRole('admin', 'superadmin') },
    async (request, reply) => {
      const result = await autoSuspendService.runInactivityCheck();
      if (result.suspended.length > 0) {
        await logPlatformAction({
          actorId: request.user!.userId!,
          actorEmail: request.user!.email,
          action: 'bulk_partner_action',
          entityType: 'partner',
          metadata: { action: 'auto_suspend', partnerIds: result.suspended },
          ipAddress: request.ip,
        });
      }
      return reply.send(result);
    }
  );
}
