import { db } from '../db';
import { suppliers, purchaseOrders } from '../db/schema/suppliers';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
import type { AcknowledgePOInput, GetPOsQuery } from '@partner-portal/common';

export const supplierService = {
  async getSupplierByPartnerId(partnerId: string) {
    const [supplier] = await db.select()
      .from(suppliers)
      .where(eq(suppliers.partnerId, partnerId))
      .limit(1);
    
    if (!supplier) {
      return null;
    }
    return supplier;
  },

  async getSupplierById(supplierId: string) {
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.supplierId, supplierId))
      .limit(1);
    return supplier ?? null;
  },

  async getPurchaseOrders(supplierId: string, query: GetPOsQuery) {
    const { page = 1, limit = 20, status, tenantId, dateFrom, dateTo, sortBy = 'poDate', sortOrder = 'desc' } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(purchaseOrders.supplierId, supplierId)];
    
    if (status) {
      conditions.push(eq(purchaseOrders.status, status));
    }
    if (tenantId) {
      conditions.push(eq(purchaseOrders.tenantId, tenantId));
    }
    if (dateFrom) {
      conditions.push(gte(purchaseOrders.poDate, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(purchaseOrders.poDate, dateTo));
    }

    const whereClause = and(...conditions);

    let orderBy;
    switch (sortBy) {
      case 'deliveryDate':
        orderBy = sortOrder === 'asc' ? asc(purchaseOrders.deliveryDate) : desc(purchaseOrders.deliveryDate);
        break;
      case 'totalAmount':
        orderBy = sortOrder === 'asc' ? asc(purchaseOrders.totalAmount) : desc(purchaseOrders.totalAmount);
        break;
      default:
        orderBy = sortOrder === 'asc' ? asc(purchaseOrders.poDate) : desc(purchaseOrders.poDate);
    }

    const results = await db.select()
      .from(purchaseOrders)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const totalCount = results.length; // In production, use COUNT query

    return {
      purchaseOrders: results,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  },

  async getPurchaseOrderById(poId: string) {
    const [po] = await db.select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.poId, poId))
      .limit(1);
    
    if (!po) {
      throw new Error('Purchase order not found');
    }
    return po;
  },

  async acknowledgePO(poId: string, data: AcknowledgePOInput, user: any) {
    const [po] = await db.update(purchaseOrders)
      .set({
        status: data.acknowledged ? 'acknowledged' : 'cancelled',
        acknowledgedBy: data.acknowledged ? user.userId : null,
        acknowledgedAt: data.acknowledged ? new Date() : null,
        notes: data.rejectionReason || data.modifications?.notes,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.poId, poId))
      .returning();
    
    if (!po) {
      throw new Error('Purchase order not found');
    }
    
    return po;
  },

  async updatePOStatus(poId: string, data: any, user: any) {
    const statusMap: Record<string, string> = {
      'in_production': 'confirmed',
      'ready_for_shipment': 'partial',
      'shipped': 'partial',
      'delivered': 'completed',
    };

    const [po] = await db.update(purchaseOrders)
      .set({
        status: statusMap[data.status] || 'confirmed',
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.poId, poId))
      .returning();
    
    if (!po) {
      throw new Error('Purchase order not found');
    }
    
    return po;
  },
};
