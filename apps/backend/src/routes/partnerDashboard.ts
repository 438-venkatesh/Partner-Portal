import { FastifyInstance } from 'fastify';
import { partnerDashboardService } from '../services/partnerDashboardService';
import { authenticatePartner } from '../middleware/partnerAuth';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function partnerDashboardRoutes(fastify: FastifyInstance) {
  // Add partner authentication middleware to all routes
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/onboarding', async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const payload = await partnerDashboardService.getPartnerOnboarding(partnerId);
      return reply.send(payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(error, 'Get partner onboarding error');
      return reply.code(500).send({
        error: 'Failed to load onboarding',
        message,
      });
    }
  });
  // Get partner's accessible tenants
  fastify.get('/tenants', async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      const tenants = await partnerDashboardService.getPartnerTenants(partnerId);
      return reply.send({ tenants });
    } catch (error: any) {
      fastify.log.error('Get partner tenants error:', error);
      return reply.code(500).send({
        error: 'Failed to get tenants',
        message: error.message,
      });
    }
  });

  fastify.get('/relationships', async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const relationships = await partnerDashboardService.listServiceRelationships(partnerId);
      return reply.send({ relationships });
    } catch (error: any) {
      fastify.log.error('Get partner relationships error:', error);
      return reply.code(500).send({
        error: 'Failed to get relationships',
        message: error.message,
      });
    }
  });

  // Get dashboard statistics
  fastify.get('/stats', async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      const stats = await partnerDashboardService.getDashboardStats(partnerId);
      return reply.send(stats);
    } catch (error: any) {
      fastify.log.error('Get dashboard stats error:', error);
      return reply.code(500).send({
        error: 'Failed to get dashboard stats',
        message: error.message,
      });
    }
  });

  // Get tenant detail
  fastify.get('/tenants/:tenantId', {
    schema: {
      params: zodToFastifySchema(z.object({
        tenantId: z.string().uuid(),
      })),
    },
  }, async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      const { tenantId } = request.params as { tenantId: string };

      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const tenantDetail = await partnerDashboardService.getTenantDetail(partnerId, tenantId);
      return reply.send(tenantDetail);
    } catch (error: any) {
      fastify.log.error('Get tenant detail error:', error);
      return reply.code(404).send({
        error: 'Tenant not found',
        message: error.message,
      });
    }
  });

  // Get service timelines
  fastify.get('/timelines', {
    schema: {
      querystring: zodToFastifySchema(z.object({
        tenantId: z.string().uuid().optional(),
        status: z.string().optional(),
        dueDateFrom: z.string().optional(),
        dueDateTo: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      const query = request.query as any;
      const filters: any = {};
      
      if (query.tenantId) filters.tenantId = query.tenantId;
      if (query.status) filters.status = query.status;
      if (query.dueDateFrom) filters.dueDateFrom = new Date(query.dueDateFrom);
      if (query.dueDateTo) filters.dueDateTo = new Date(query.dueDateTo);
      
      const timelines = await partnerDashboardService.getServiceTimelines(partnerId, filters);
      return reply.send({ timelines });
    } catch (error: any) {
      fastify.log.error('Get service timelines error:', error);
      return reply.code(500).send({
        error: 'Failed to get timelines',
        message: error.message,
      });
    }
  });

  // Create service timeline
  fastify.post('/timelines', {
    schema: {
      body: zodToFastifySchema(z.object({
        relationshipId: z.string().uuid(),
        tenantId: z.string().uuid(),
        serviceId: z.string().uuid(),
        serviceType: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        recurrenceType: z.enum(['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
        recurrenceInterval: z.string().optional(),
        assignedTo: z.string().uuid().optional(),
        notes: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      const body = request.body as any;
      const timeline = await partnerDashboardService.createServiceTimeline(partnerId, {
        relationshipId: body.relationshipId,
        tenantId: body.tenantId,
        serviceId: body.serviceId,
        serviceType: body.serviceType,
        title: body.title,
        description: body.description,
        dueDate: new Date(body.dueDate),
        priority: body.priority,
        recurrenceType: body.recurrenceType,
        recurrenceInterval: body.recurrenceInterval,
        assignedTo: body.assignedTo,
        notes: body.notes,
      });
      
      return reply.code(201).send(timeline);
    } catch (error: any) {
      fastify.log.error('Create timeline error:', error);
      return reply.code(500).send({
        error: 'Failed to create timeline',
        message: error.message,
      });
    }
  });

  // Update timeline (full update)
  fastify.put('/timelines/:timelineId', {
    schema: {
      params: zodToFastifySchema(z.object({
        timelineId: z.string().uuid(),
      })),
      body: zodToFastifySchema(z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        status: z.enum(['pending', 'in_progress', 'completed', 'overdue', 'cancelled']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        assignedTo: z.string().uuid().optional(),
        notes: z.string().optional(),
        completedDate: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      const { timelineId } = request.params as { timelineId: string };
      const body = request.body as any;
      
      const timeline = await partnerDashboardService.updateServiceTimeline(partnerId, timelineId, {
        title: body.title,
        description: body.description,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        status: body.status,
        priority: body.priority,
        assignedTo: body.assignedTo,
        notes: body.notes,
        completedDate: body.completedDate ? new Date(body.completedDate) : undefined,
      });
      
      return reply.send(timeline);
    } catch (error: any) {
      fastify.log.error('Update timeline error:', error);
      return reply.code(500).send({
        error: 'Failed to update timeline',
        message: error.message,
      });
    }
  });

  // Update timeline status (quick update)
  fastify.put('/timelines/:timelineId/status', {
    schema: {
      params: zodToFastifySchema(z.object({
        timelineId: z.string().uuid(),
      })),
      body: zodToFastifySchema(z.object({
        status: z.enum(['pending', 'in_progress', 'completed', 'overdue', 'cancelled']),
        completedDate: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      const { timelineId } = request.params as { timelineId: string };
      const { status, completedDate } = request.body as { status: string; completedDate?: string };
      
      const timeline = await partnerDashboardService.updateServiceTimeline(partnerId, timelineId, {
        status,
        completedDate: completedDate ? new Date(completedDate) : undefined,
      });
      
      return reply.send(timeline);
    } catch (error: any) {
      fastify.log.error('Update timeline status error:', error);
      return reply.code(500).send({
        error: 'Failed to update timeline',
        message: error.message,
      });
    }
  });
}

