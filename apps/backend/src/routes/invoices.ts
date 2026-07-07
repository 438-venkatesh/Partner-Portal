import { FastifyInstance } from 'fastify';
import { invoiceService } from '../services/invoiceService';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function invoiceRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // Get supplier invoices
  fastify.get('/suppliers/:supplierId/invoices', {
    schema: {
      params: zodToFastifySchema(z.object({ supplierId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const invoices = await invoiceService.getSupplierInvoices(
      request.params.supplierId,
      request.query
    );
    return reply.send(invoices);
  });

  // Get invoice by ID
  fastify.get('/invoices/:invoiceId', {
    schema: {
      params: zodToFastifySchema(z.object({ invoiceId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const invoice = await invoiceService.getInvoiceById(request.params.invoiceId);
    return reply.send(invoice);
  });

  // Create invoice
  fastify.post('/suppliers/:supplierId/invoices', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(z.object({ supplierId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        tenantId: z.string().uuid(),
        poId: z.string().uuid().optional(),
        invoiceDate: z.string().optional(),
        dueDate: z.string(),
        items: z.array(z.object({
          itemId: z.string().uuid(),
          productCode: z.string(),
          productName: z.string(),
          quantity: z.number().positive(),
          unitPrice: z.number().nonnegative(),
          totalPrice: z.number().nonnegative(),
        })),
        subtotal: z.number().nonnegative(),
        taxAmount: z.number().nonnegative().default(0),
        discountAmount: z.number().nonnegative().default(0),
        totalAmount: z.number().positive(),
        currency: z.string().length(3).default('USD'),
        paymentTerms: z.string().optional(),
        billingAddress: z.record(z.unknown()).optional(),
        notes: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    const invoice = await invoiceService.createInvoice(
      request.params.supplierId,
      request.body,
      request.user
    );
    return reply.code(201).send(invoice);
  });

  // Update invoice
  fastify.put('/invoices/:invoiceId', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(z.object({ invoiceId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        items: z.array(z.any()).optional(),
        subtotal: z.number().nonnegative().optional(),
        taxAmount: z.number().nonnegative().optional(),
        discountAmount: z.number().nonnegative().optional(),
        totalAmount: z.number().positive().optional(),
        dueDate: z.string().optional(),
        status: z.enum(['draft', 'sent', 'pending', 'partial', 'paid', 'overdue', 'cancelled', 'disputed']).optional(),
        notes: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    const invoice = await invoiceService.updateInvoice(
      request.params.invoiceId,
      request.body,
      request.user
    );
    return reply.send(invoice);
  });

  // Send invoice
  fastify.post('/invoices/:invoiceId/send', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(z.object({ invoiceId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    await invoiceService.sendInvoice(request.params.invoiceId, request.user);
    return reply.code(204).send();
  });

  // Record payment
  fastify.post('/invoices/:invoiceId/payments', {
    preHandler: requireOperationsDbRole('admin', 'superadmin'),
    schema: {
      params: zodToFastifySchema(z.object({ invoiceId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        paymentAmount: z.number().positive(),
        paymentDate: z.string(),
        paymentMethod: z.string(),
        paymentReference: z.string().optional(),
        transactionId: z.string().optional(),
        notes: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    const payment = await invoiceService.recordPayment(
      request.params.invoiceId,
      request.body,
      request.user
    );
    return reply.code(201).send(payment);
  });

  // Get invoice payments
  fastify.get('/invoices/:invoiceId/payments', {
    schema: {
      params: zodToFastifySchema(z.object({ invoiceId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const payments = await invoiceService.getInvoicePayments(request.params.invoiceId);
    return reply.send(payments);
  });
}

