import { db } from '../db';
import { logisticsPartners, shipments, shipmentTrackingEvents } from '../db/schema/logistics';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
import type { AcceptShipmentSchema, UpdateShipmentStatusSchema, GetShipmentsQuery } from '@partner-portal/common';

export const logisticsService = {
  async getLogisticsByPartnerId(partnerId: string) {
    const [logistics] = await db.select()
      .from(logisticsPartners)
      .where(eq(logisticsPartners.partnerId, partnerId))
      .limit(1);
    
    if (!logistics) {
      return null;
    }
    return logistics;
  },

  async getShipments(logisticsId: string, query: GetShipmentsQuery) {
    const { page = 1, limit = 20, status, tenantId, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(shipments.logisticsId, logisticsId)];
    
    if (status) {
      conditions.push(eq(shipments.status, status));
    }
    if (tenantId) {
      conditions.push(eq(shipments.tenantId, tenantId));
    }

    const whereClause = and(...conditions);

    let orderBy;
    switch (sortBy) {
      case 'pickupDate':
        orderBy = sortOrder === 'asc' ? asc(shipments.pickupDate) : desc(shipments.pickupDate);
        break;
      case 'deliveryDate':
        orderBy = sortOrder === 'asc' ? asc(shipments.deliveryDate) : desc(shipments.deliveryDate);
        break;
      default:
        orderBy = sortOrder === 'asc' ? asc(shipments.createdAt) : desc(shipments.createdAt);
    }

    const results = await db.select()
      .from(shipments)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const totalCount = results.length;

    return {
      shipments: results,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  },

  async getShipmentById(shipmentId: string) {
    const [shipment] = await db.select()
      .from(shipments)
      .where(eq(shipments.shipmentId, shipmentId))
      .limit(1);
    
    if (!shipment) {
      throw new Error('Shipment not found');
    }
    return shipment;
  },

  async acceptShipment(shipmentId: string, data: AcceptShipmentSchema, user: any) {
    const [shipment] = await db.update(shipments)
      .set({
        status: data.accepted ? 'picked_up' : 'cancelled',
        assignedDriver: data.assignedDriver,
        vehicleNumber: data.vehicleNumber,
        updatedAt: new Date(),
      })
      .where(eq(shipments.shipmentId, shipmentId))
      .returning();
    
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    if (data.accepted) {
      // Add tracking event
      await db.insert(shipmentTrackingEvents).values({
        shipmentId,
        eventType: 'pickup',
        description: 'Shipment picked up',
        status: 'picked_up',
        updatedBy: user.userId,
      });
    }
    
    return shipment;
  },

  async updateShipmentStatus(shipmentId: string, data: UpdateShipmentStatusSchema, user: any) {
    const [shipment] = await db.update(shipments)
      .set({
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(shipments.shipmentId, shipmentId))
      .returning();
    
    if (!shipment) {
      throw new Error('Shipment not found');
    }
    
    // Add tracking event
    await db.insert(shipmentTrackingEvents).values({
      shipmentId,
      eventType: data.status,
      location: data.location,
      description: data.description,
      status: data.status,
      updatedBy: user.userId,
    });
    
    return shipment;
  },

  async addTrackingEvent(shipmentId: string, data: any, user: any) {
    const [event] = await db.insert(shipmentTrackingEvents).values({
      shipmentId,
      eventType: data.eventType,
      location: data.location,
      description: data.description,
      updatedBy: user.userId,
    }).returning();
    
    return event;
  },

  async uploadDeliveryProof(shipmentId: string, file: any, user: any) {
    // In production, upload file to S3/Cloud Storage
    const fileUrl = `/uploads/delivery-proof/${shipmentId}/${file.filename}`;
    
    const [shipment] = await db.update(shipments)
      .set({
        status: 'delivered',
        actualDeliveryDate: new Date(),
        deliveryProof: {
          signature: fileUrl,
          uploadedAt: new Date(),
        },
        updatedAt: new Date(),
      })
      .where(eq(shipments.shipmentId, shipmentId))
      .returning();
    
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    // Add tracking event
    await db.insert(shipmentTrackingEvents).values({
      shipmentId,
      eventType: 'delivered',
      description: 'Shipment delivered',
      status: 'delivered',
      updatedBy: user.userId,
    });
    
    return shipment;
  },
};
