import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { billingService } from '../services/billingService';
import {
  createBillingPlanSchema,
  updateBillingPlanSchema,
  assignBillingPlanSchema,
  markBillingInvoicePaidSchema,
} from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function billingAdminRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/plans', async (_request, reply) => {
    const plans = await billingService.listPlans();
    return reply.send({ plans });
  });

  fastify.post(
    '/plans',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(createBillingPlanSchema) },
    },
    async (request, reply) => {
      const plan = await billingService.createPlan(request.body as any);
      return reply.code(201).send({ plan });
    }
  );

  fastify.patch(
    '/plans/:planId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ planId: z.string().uuid() })),
        body: zodToFastifySchema(updateBillingPlanSchema),
      },
    },
    async (request, reply) => {
      const plan = await billingService.updatePlan(
        (request.params as { planId: string }).planId,
        request.body as any
      );
      if (!plan) return reply.code(404).send({ message: 'Plan not found' });
      return reply.send({ plan });
    }
  );

  fastify.post(
    '/subscriptions',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(assignBillingPlanSchema) },
    },
    async (request, reply) => {
      const body = request.body as { partnerId: string; planId: string; billingCycle?: string };
      const sub = await billingService.assignPlan(body.partnerId, body.planId, body.billingCycle);
      return reply.code(201).send({ subscription: sub });
    }
  );

  // ---- invoices ----
  fastify.get(
    '/invoices',
    { schema: { querystring: zodToFastifySchema(z.object({ status: z.string().optional() })) } },
    async (request, reply) => {
      const { status } = request.query as { status?: string };
      const invoices = await billingService.listAllInvoices(status);
      return reply.send({ invoices });
    }
  );

  fastify.post(
    '/invoices/run-billing-cycle',
    { preHandler: requireOperationsDbRole('admin', 'superadmin') },
    async (_request, reply) => {
      const result = await billingService.runBillingCycle();
      return reply.send(result);
    }
  );

  fastify.post(
    '/invoices/:invoiceId/mark-paid',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ invoiceId: z.string().uuid() })),
        body: zodToFastifySchema(markBillingInvoicePaidSchema),
      },
    },
    async (request, reply) => {
      const { paidReference } = request.body as { paidReference?: string };
      const invoice = await billingService.markInvoicePaid(
        (request.params as { invoiceId: string }).invoiceId,
        paidReference
      );
      if (!invoice) return reply.code(400).send({ message: 'Invoice not found or already paid' });
      return reply.send({ invoice });
    }
  );
}
