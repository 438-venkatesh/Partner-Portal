import { FastifyInstance } from 'fastify';
import { logisticsService } from '../services/logisticsService';
import { authenticate } from '../middleware/auth';
import {
  acceptShipmentSchema,
  updateShipmentStatusSchema,
  createShipmentSchema,
} from '@partner-portal/common';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function logisticsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // Get logistics partner by partner ID
  fastify.get('/by-partner/:partnerId', {
    schema: {
      params: zodToFastifySchema(z.object({ partnerId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const logistics = await logisticsService.getLogisticsByPartnerId(request.params.partnerId);
    if (!logistics) {
      return reply.code(404).send({ message: 'Logistics partner not found for this partner' });
    }
    return reply.send(logistics);
  });

  // Get shipments for logistics partner
  fastify.get('/:logisticsId/shipments', {
    schema: {
      params: zodToFastifySchema(z.object({ logisticsId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const shipments = await logisticsService.getShipments(
      request.params.logisticsId,
      request.query
    );
    return reply.send(shipments);
  });

  // Get shipment by ID
  fastify.get('/shipments/:shipmentId', {
    schema: {
      params: zodToFastifySchema(z.object({ shipmentId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const shipment = await logisticsService.getShipmentById(request.params.shipmentId);
    return reply.send(shipment);
  });

  // Accept shipment
  fastify.post('/shipments/:shipmentId/accept', {
    schema: {
      params: zodToFastifySchema(z.object({ shipmentId: z.string().uuid() })),
      body: zodToFastifySchema(acceptShipmentSchema),
    },
  }, async (request, reply) => {
    const shipment = await logisticsService.acceptShipment(
      request.params.shipmentId,
      request.body,
      request.user
    );
    return reply.send(shipment);
  });

  // Update shipment status
  fastify.put('/shipments/:shipmentId/status', {
    schema: {
      params: zodToFastifySchema(z.object({ shipmentId: z.string().uuid() })),
      body: zodToFastifySchema(updateShipmentStatusSchema),
    },
  }, async (request, reply) => {
    const shipment = await logisticsService.updateShipmentStatus(
      request.params.shipmentId,
      request.body,
      request.user
    );
    return reply.send(shipment);
  });

  // Add tracking event
  fastify.post('/shipments/:shipmentId/tracking', {
    schema: {
      params: zodToFastifySchema(z.object({ shipmentId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        eventType: z.enum(['pickup', 'in_transit', 'out_for_delivery', 'delivered', 'exception']),
        location: z.object({
          latitude: z.number(),
          longitude: z.number(),
          address: z.string().optional(),
        }).optional(),
        description: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    const event = await logisticsService.addTrackingEvent(
      request.params.shipmentId,
      request.body,
      request.user
    );
    return reply.send(event);
  });

  // Upload delivery proof
  fastify.post('/shipments/:shipmentId/delivery-proof', {
    schema: {
      params: zodToFastifySchema(z.object({ shipmentId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const data = await request.file();
    const shipment = await logisticsService.uploadDeliveryProof(
      request.params.shipmentId,
      data,
      request.user
    );
    return reply.send(shipment);
  });
}

