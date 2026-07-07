import { FastifyInstance } from 'fastify';
import { serviceService } from '../services/serviceService';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function serviceRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // Get all available services (catalog)
  fastify.get('/catalog', async (request, reply) => {
    const services = await serviceService.getServiceCatalog();
    return reply.send(services);
  });

  // Get partner's service offerings
  fastify.get('/partners/:partnerId/offerings', {
    schema: {
      params: zodToFastifySchema(z.object({ partnerId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const offerings = await serviceService.getPartnerOfferings(request.params.partnerId);
    return reply.send(offerings);
  });

  // Get partner's service relationships (with tenants)
  fastify.get('/partners/:partnerId/relationships', {
    schema: {
      params: zodToFastifySchema(z.object({ partnerId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const relationships = await serviceService.getPartnerRelationships(
      request.params.partnerId,
      request.query
    );
    return reply.send(relationships);
  });

  // Get service relationship by ID
  fastify.get('/relationships/:relationshipId', {
    schema: {
      params: zodToFastifySchema(z.object({ relationshipId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const relationship = await serviceService.getRelationshipById(request.params.relationshipId);
    return reply.send(relationship);
  });

  // Create service relationship
  fastify.post('/relationships', {
    schema: {
      body: zodToFastifySchema(
        z
          .object({
            partnerId: z.string().uuid(),
            tenantId: z.string().uuid(),
            serviceId: z.string().uuid(),
            requestedServices: z.array(z.string().uuid()).min(1),
            applications: z.array(z.string()).optional(),
            modules: z.record(z.unknown()).optional(),
            permissions: z.record(z.unknown()).optional(),
            startDate: z.string().optional(),
            notes: z.string().optional(),
          })
          .refine((b) => b.requestedServices.includes(b.serviceId), {
            message: 'serviceId must be included in requestedServices',
            path: ['serviceId'],
          })
      ),
    },
  }, async (request, reply) => {
    try {
      const relationship = await serviceService.createRelationship(
        request.body,
        request.user
      );
      return reply.code(201).send(relationship);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      request.log.error({ err }, 'createRelationship failed');
      const status = e.code === '23505' ? 409 : 400;
      return reply.code(status).send({
        message: e.message || 'Could not create service relationship',
      });
    }
  });

  // Update service relationship
  fastify.put('/relationships/:relationshipId', {
    schema: {
      params: zodToFastifySchema(z.object({ relationshipId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        approvedServices: z.array(z.string()).optional(),
        applications: z.array(z.string()).optional(),
        modules: z.record(z.unknown()).optional(),
        permissions: z.record(z.unknown()).optional(),
        customPermissions: z.record(z.unknown()).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        notes: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    const relationship = await serviceService.updateRelationship(
      request.params.relationshipId,
      request.body,
      request.user
    );
    return reply.send(relationship);
  });

  // Approve service relationship (by tenant admin, partner admin, or platform admin)
  fastify.post('/relationships/:relationshipId/approve', {
    schema: {
      params: zodToFastifySchema(z.object({ relationshipId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        approvedBy: z.enum(['tenant_admin', 'partner_admin', 'platform_admin']),
        approvedServices: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    await serviceService.approveRelationship(
      request.params.relationshipId,
      request.body,
      request.user
    );
    return reply.code(204).send();
  });

  // Terminate service relationship
  fastify.post('/relationships/:relationshipId/terminate', {
    schema: {
      params: zodToFastifySchema(z.object({ relationshipId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        terminationReason: z.string(),
        notes: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    await serviceService.terminateRelationship(
      request.params.relationshipId,
      request.body,
      request.user
    );
    return reply.code(204).send();
  });
}

