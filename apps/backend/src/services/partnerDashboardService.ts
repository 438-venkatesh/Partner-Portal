import { db } from '../db';
import {
  partnerTenantServiceRelationships,
  partnerServices,
  serviceTimelines,
  tenants,
} from '../db/schema';
import { eq, and, gte, lte, or, sql, desc } from 'drizzle-orm';
import { partners } from '../db/schema/partners';
import { onboardingService } from './onboardingService';
import { supplierOnboardingService } from './supplierOnboardingService';
import { logisticsOnboardingService } from './logisticsOnboardingService';
import { supplierService } from './supplierService';
import { logisticsService } from './logisticsService';
import { partnerTypeFlags } from './partnerApprovalPreconditions';

export const partnerDashboardService = {
  /**
   * All service relationships for this partner (any status), with tenant and service labels.
   */
  async listServiceRelationships(partnerId: string) {
    const rows = await db
      .select({
        relationshipId: partnerTenantServiceRelationships.relationshipId,
        tenantId: partnerTenantServiceRelationships.tenantId,
        serviceId: partnerTenantServiceRelationships.serviceId,
        status: partnerTenantServiceRelationships.status,
        startDate: partnerTenantServiceRelationships.startDate,
        endDate: partnerTenantServiceRelationships.endDate,
        requestedServices: partnerTenantServiceRelationships.requestedServices,
        approvedServices: partnerTenantServiceRelationships.approvedServices,
        createdAt: partnerTenantServiceRelationships.createdAt,
        tenantName: tenants.tenantName,
        tenantCode: tenants.tenantCode,
        serviceName: partnerServices.serviceName,
        serviceCode: partnerServices.serviceCode,
      })
      .from(partnerTenantServiceRelationships)
      .leftJoin(tenants, eq(partnerTenantServiceRelationships.tenantId, tenants.tenantId))
      .innerJoin(
        partnerServices,
        eq(partnerTenantServiceRelationships.serviceId, partnerServices.serviceId)
      )
      .where(eq(partnerTenantServiceRelationships.partnerId, partnerId))
      .orderBy(desc(partnerTenantServiceRelationships.createdAt));

    return rows;
  },

  /**
   * Get all tenants accessible to a partner
   */
  async getPartnerTenants(partnerId: string) {
    const relationships = await db
      .select({
        relationshipId: partnerTenantServiceRelationships.relationshipId,
        tenantId: partnerTenantServiceRelationships.tenantId,
        serviceId: partnerTenantServiceRelationships.serviceId,
        status: partnerTenantServiceRelationships.status,
        startDate: partnerTenantServiceRelationships.startDate,
        endDate: partnerTenantServiceRelationships.endDate,
        requestedServices: partnerTenantServiceRelationships.requestedServices,
        approvedServices: partnerTenantServiceRelationships.approvedServices,
        createdAt: partnerTenantServiceRelationships.createdAt,
        tenantName: tenants.tenantName,
        tenantCode: tenants.tenantCode,
        serviceName: partnerServices.serviceName,
        serviceCode: partnerServices.serviceCode,
      })
      .from(partnerTenantServiceRelationships)
      .leftJoin(tenants, eq(partnerTenantServiceRelationships.tenantId, tenants.tenantId))
      .innerJoin(
        partnerServices,
        eq(partnerTenantServiceRelationships.serviceId, partnerServices.serviceId)
      )
      .where(
        and(
          eq(partnerTenantServiceRelationships.partnerId, partnerId),
          eq(partnerTenantServiceRelationships.status, 'active')
        )
      );
    
    // Group by tenantId to get unique tenants
    const tenantMap = new Map();
    relationships.forEach(rel => {
      if (!tenantMap.has(rel.tenantId)) {
        tenantMap.set(rel.tenantId, {
          tenantId: rel.tenantId,
          tenantName: rel.tenantName,
          tenantCode: rel.tenantCode,
          relationships: [],
          serviceCount: 0,
          firstServiceDate: rel.startDate,
        });
      }
      const tenant = tenantMap.get(rel.tenantId);
      tenant.relationships.push(rel);
      tenant.serviceCount++;
      if (rel.startDate && (!tenant.firstServiceDate || rel.startDate < tenant.firstServiceDate)) {
        tenant.firstServiceDate = rel.startDate;
      }
    });
    
    return Array.from(tenantMap.values());
  },

  /**
   * Get service timelines for a partner
   */
  async getServiceTimelines(partnerId: string, filters?: {
    tenantId?: string;
    status?: string;
    dueDateFrom?: Date;
    dueDateTo?: Date;
  }) {
    const conditions = [eq(serviceTimelines.partnerId, partnerId)];
    
    if (filters?.tenantId) {
      conditions.push(eq(serviceTimelines.tenantId, filters.tenantId));
    }
    
    if (filters?.status) {
      conditions.push(eq(serviceTimelines.status, filters.status));
    }
    
    if (filters?.dueDateFrom) {
      conditions.push(gte(serviceTimelines.dueDate, filters.dueDateFrom));
    }
    
    if (filters?.dueDateTo) {
      conditions.push(lte(serviceTimelines.dueDate, filters.dueDateTo));
    }
    
    const timelines = await db
      .select()
      .from(serviceTimelines)
      .where(and(...conditions))
      .orderBy(serviceTimelines.dueDate);
    
    return timelines;
  },

  /**
   * Create a new service timeline
   */
  async createServiceTimeline(partnerId: string, data: {
    relationshipId: string;
    tenantId: string;
    serviceId: string;
    serviceType: string;
    title: string;
    description?: string;
    dueDate: Date;
    priority?: string;
    recurrenceType?: string;
    recurrenceInterval?: string;
    assignedTo?: string;
    notes?: string;
  }) {
    // Verify relationship belongs to partner
    const [relationship] = await db
      .select()
      .from(partnerTenantServiceRelationships)
      .where(
        and(
          eq(partnerTenantServiceRelationships.relationshipId, data.relationshipId),
          eq(partnerTenantServiceRelationships.partnerId, partnerId),
          eq(partnerTenantServiceRelationships.status, 'active')
        )
      )
      .limit(1);

    if (!relationship) {
      throw new Error('Service relationship not found or inactive');
    }

    // Calculate next due date for recurring timelines
    let nextDueDate: Date | null = null;
    if (data.recurrenceType && data.recurrenceType !== 'none') {
      nextDueDate = new Date(data.dueDate);
      const interval = parseInt(data.recurrenceInterval || '1');
      
      switch (data.recurrenceType) {
        case 'daily':
          nextDueDate.setDate(nextDueDate.getDate() + interval);
          break;
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + (7 * interval));
          break;
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + interval);
          break;
        case 'quarterly':
          nextDueDate.setMonth(nextDueDate.getMonth() + (3 * interval));
          break;
        case 'yearly':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + interval);
          break;
      }
    }

    const [timeline] = await db
      .insert(serviceTimelines)
      .values({
        relationshipId: data.relationshipId,
        partnerId,
        tenantId: data.tenantId,
        serviceId: data.serviceId,
        serviceType: data.serviceType,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        priority: data.priority || 'medium',
        recurrenceType: data.recurrenceType || 'none',
        recurrenceInterval: data.recurrenceInterval,
        nextDueDate,
        assignedTo: data.assignedTo,
        notes: data.notes,
        status: 'pending',
      })
      .returning();

    return timeline;
  },

  /**
   * Update service timeline
   */
  async updateServiceTimeline(partnerId: string, timelineId: string, data: {
    title?: string;
    description?: string;
    dueDate?: Date;
    status?: string;
    priority?: string;
    assignedTo?: string;
    notes?: string;
    completedDate?: Date;
  }) {
    // Verify timeline belongs to partner
    const [existing] = await db
      .select()
      .from(serviceTimelines)
      .where(
        and(
          eq(serviceTimelines.timelineId, timelineId),
          eq(serviceTimelines.partnerId, partnerId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error('Service timeline not found');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.completedDate !== undefined) updateData.completedDate = data.completedDate;

    // If status is completed and no completedDate provided, set it
    if (data.status === 'completed' && !data.completedDate && !existing.completedDate) {
      updateData.completedDate = new Date();
    }

    // Handle recurring timelines - create next occurrence if completed
    if (data.status === 'completed' && existing.recurrenceType && existing.recurrenceType !== 'none' && existing.nextDueDate) {
      // Create next occurrence
      const nextTimeline = {
        relationshipId: existing.relationshipId,
        tenantId: existing.tenantId,
        serviceId: existing.serviceId,
        serviceType: existing.serviceType,
        title: existing.title,
        description: existing.description,
        dueDate: existing.nextDueDate,
        priority: existing.priority,
        recurrenceType: existing.recurrenceType,
        recurrenceInterval: existing.recurrenceInterval,
        assignedTo: existing.assignedTo,
        notes: existing.notes,
      };

      // Calculate next due date
      let nextDueDate: Date | null = null;
      if (nextTimeline.recurrenceType && nextTimeline.recurrenceType !== 'none') {
        nextDueDate = new Date(nextTimeline.dueDate);
        const interval = parseInt(nextTimeline.recurrenceInterval || '1');
        
        switch (nextTimeline.recurrenceType) {
          case 'daily':
            nextDueDate.setDate(nextDueDate.getDate() + interval);
            break;
          case 'weekly':
            nextDueDate.setDate(nextDueDate.getDate() + (7 * interval));
            break;
          case 'monthly':
            nextDueDate.setMonth(nextDueDate.getMonth() + interval);
            break;
          case 'quarterly':
            nextDueDate.setMonth(nextDueDate.getMonth() + (3 * interval));
            break;
          case 'yearly':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + interval);
            break;
        }
        nextTimeline.nextDueDate = nextDueDate;
      }

      await db.insert(serviceTimelines).values({
        ...nextTimeline,
        partnerId,
        status: 'pending',
      });
    }

    const [updated] = await db
      .update(serviceTimelines)
      .set(updateData)
      .where(eq(serviceTimelines.timelineId, timelineId))
      .returning();

    return updated;
  },

  /**
   * Get tenant detail for partner
   */
  async getTenantDetail(partnerId: string, tenantId: string) {
    // Get all active relationships with this tenant
    const relationships = await db
      .select()
      .from(partnerTenantServiceRelationships)
      .where(
        and(
          eq(partnerTenantServiceRelationships.partnerId, partnerId),
          eq(partnerTenantServiceRelationships.tenantId, tenantId),
          eq(partnerTenantServiceRelationships.status, 'active')
        )
      );

    if (relationships.length === 0) {
      throw new Error('Tenant not found or no active service relationships');
    }

    // Get service timelines for this tenant
    const timelines = await db
      .select()
      .from(serviceTimelines)
      .where(
        and(
          eq(serviceTimelines.partnerId, partnerId),
          eq(serviceTimelines.tenantId, tenantId)
        )
      )
      .orderBy(serviceTimelines.dueDate);

    const [tenantInfo] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    return {
      tenantId,
      tenant: tenantInfo ?? null,
      relationships,
      timelines,
      serviceCount: relationships.length,
      activeTimelines: timelines.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length,
    };
  },

  /**
   * Get dashboard statistics for a partner
   */
  async getDashboardStats(partnerId: string) {
    // Get active tenants count
    const activeTenants = await db
      .select({
        tenantId: partnerTenantServiceRelationships.tenantId,
      })
      .from(partnerTenantServiceRelationships)
      .where(
        and(
          eq(partnerTenantServiceRelationships.partnerId, partnerId),
          eq(partnerTenantServiceRelationships.status, 'active')
        )
      );
    
    const uniqueTenants = new Set(activeTenants.map(t => t.tenantId));
    
    // Get upcoming due dates (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingTimelines = await db
      .select()
      .from(serviceTimelines)
      .where(
        and(
          eq(serviceTimelines.partnerId, partnerId),
          eq(serviceTimelines.status, 'pending'),
          gte(serviceTimelines.dueDate, new Date()),
          lte(serviceTimelines.dueDate, thirtyDaysFromNow)
        )
      )
      .orderBy(serviceTimelines.dueDate)
      .limit(10);
    
    // Get overdue timelines
    const overdueTimelines = await db
      .select()
      .from(serviceTimelines)
      .where(
        and(
          eq(serviceTimelines.partnerId, partnerId),
          or(
            eq(serviceTimelines.status, 'pending'),
            eq(serviceTimelines.status, 'in_progress')
          ),
          lte(serviceTimelines.dueDate, new Date())
        )
      )
      .orderBy(serviceTimelines.dueDate)
      .limit(10);
    
    return {
      activeClients: uniqueTenants.size,
      totalRelationships: activeTenants.length,
      upcomingDueDates: upcomingTimelines.length,
      overdueItems: overdueTimelines.length,
      upcomingTimelines: upcomingTimelines,
      overdueTimelines: overdueTimelines,
    };
  },


  /**
   * Update service timeline status
   */
  async updateTimelineStatus(timelineId: string, status: string, completedDate?: Date) {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (status === 'completed' && completedDate) {
      updateData.completedDate = completedDate;
      
      // Handle recurrence - calculate next due date
      const timeline = await db
        .select()
        .from(serviceTimelines)
        .where(eq(serviceTimelines.timelineId, timelineId))
        .limit(1);
      
      if (timeline[0] && timeline[0].recurrenceType && timeline[0].recurrenceType !== 'none') {
        const nextDueDate = this.calculateNextDueDate(
          completedDate,
          timeline[0].recurrenceType,
          timeline[0].recurrenceInterval
        );
        
        if (nextDueDate) {
          updateData.nextDueDate = nextDueDate;
          updateData.status = 'pending'; // Reset to pending for next occurrence
          updateData.completedDate = null; // Clear completed date for next occurrence
        }
      }
    }
    
    const [updated] = await db
      .update(serviceTimelines)
      .set(updateData)
      .where(eq(serviceTimelines.timelineId, timelineId))
      .returning();
    
    return updated;
  },

  /** Onboarding workflow(s) for the signed-in partner — matches Operations portal by partner type. */
  async getPartnerOnboarding(partnerId: string) {
    const [partner] = await db
      .select({ partnerType: partners.partnerType })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);

    if (!partner) {
      throw new Error('Partner not found');
    }

    const flags = partnerTypeFlags(partner.partnerType);
    const payload: {
      partnerType: string;
      service?: Awaited<ReturnType<typeof onboardingService.getWorkflow>> | null;
      supplier?: Awaited<ReturnType<typeof supplierOnboardingService.getWorkflow>> | null;
      logistics?: Awaited<ReturnType<typeof logisticsOnboardingService.getWorkflow>> | null;
    } = { partnerType: partner.partnerType };

    if (flags.needsGenericOnboarding) {
      payload.service = await onboardingService.getWorkflow(partnerId);
    }

    if (flags.needsSupplierOnboarding) {
      const supplier = await supplierService.getSupplierByPartnerId(partnerId);
      payload.supplier = supplier
        ? await supplierOnboardingService.getWorkflow(supplier.supplierId)
        : null;
    }

    if (flags.needsLogisticsOnboarding) {
      const logistics = await logisticsService.getLogisticsByPartnerId(partnerId);
      payload.logistics = logistics
        ? await logisticsOnboardingService.getWorkflow(logistics.logisticsId)
        : null;
    }

    return payload;
  },

  /**
   * Calculate next due date based on recurrence
   */
  calculateNextDueDate(currentDate: Date, recurrenceType: string, interval?: string): Date | null {
    if (!recurrenceType || recurrenceType === 'none') {
      return null;
    }
    
    const nextDate = new Date(currentDate);
    const intervalNum = interval ? parseInt(interval) : 1;
    
    switch (recurrenceType) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + intervalNum);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * intervalNum));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + intervalNum);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + (3 * intervalNum));
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + intervalNum);
        break;
      default:
        return null;
    }
    
    return nextDate;
  },
};

