import { FastifyInstance } from 'fastify';
import { supplierService } from '../services/supplierService';
import { authenticate } from '../middleware/auth';
import {
  acknowledgePOSchema,
  createPurchaseOrderSchema,
} from '@partner-portal/common';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function supplierRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // Get supplier by partner ID
  fastify.get('/by-partner/:partnerId', {
    schema: {
      params: zodToFastifySchema(z.object({ partnerId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const supplier = await supplierService.getSupplierByPartnerId(request.params.partnerId);
    if (!supplier) {
      return reply.code(404).send({ message: 'Supplier not found for this partner' });
    }
    return reply.send(supplier);
  });

  // Get purchase orders for supplier
  fastify.get('/:supplierId/purchase-orders', {
    schema: {
      params: zodToFastifySchema(z.object({ supplierId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const pos = await supplierService.getPurchaseOrders(
      request.params.supplierId,
      request.query
    );
    return reply.send(pos);
  });

  // Get purchase order by ID
  fastify.get('/purchase-orders/:poId', {
    schema: {
      params: zodToFastifySchema(z.object({ poId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const po = await supplierService.getPurchaseOrderById(request.params.poId);
    return reply.send(po);
  });

  // Acknowledge purchase order
  fastify.post('/purchase-orders/:poId/acknowledge', {
    schema: {
      params: zodToFastifySchema(z.object({ poId: z.string().uuid() })),
      body: zodToFastifySchema(acknowledgePOSchema),
    },
  }, async (request, reply) => {
    const po = await supplierService.acknowledgePO(
      request.params.poId,
      request.body,
      request.user
    );
    return reply.send(po);
  });

  // Update PO status
  fastify.put('/purchase-orders/:poId/status', {
    schema: {
      params: zodToFastifySchema(z.object({ poId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        status: z.enum(['in_production', 'ready_for_shipment', 'shipped', 'delivered']),
        trackingNumber: z.string().optional(),
        shippingDate: z.date().optional(),
        estimatedDeliveryDate: z.date().optional(),
        notes: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    const po = await supplierService.updatePOStatus(
      request.params.poId,
      request.body,
      request.user
    );
    return reply.send(po);
  });
}

