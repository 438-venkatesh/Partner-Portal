import { db } from '../db';
import {
  partnerServices,
  partnerServiceOfferings,
  partnerTenantServiceRelationships,
} from '../db/schema';
import { tenants } from '../db/schema/tenants';
import { adminUsers } from '../db/schema/adminUsers';
import { eq, and } from 'drizzle-orm';
import { parseCsvWithHeader } from '../utils/csv';
import { collectMultipartUpload } from '../utils/readMultipartField';
import { serviceImportRowSchema, type CreateServiceInput } from '@partner-portal/common';
import type { FastifyRequest } from 'fastify';

function flattenRelationshipRow(row: {
  relationship: typeof partnerTenantServiceRelationships.$inferSelect;
  service: typeof partnerServices.$inferSelect;
  tenant: typeof tenants.$inferSelect | null;
}) {
  const { relationship, service, tenant } = row;
  return {
    ...relationship,
    service,
    tenant: tenant
      ? {
          tenantId: tenant.tenantId,
          tenantCode: tenant.tenantCode,
          tenantName: tenant.tenantName,
          status: tenant.status,
        }
      : undefined,
  };
}

export const serviceService = {
  async getServiceCatalog() {
    const services = await db.select().from(partnerServices).where(eq(partnerServices.isActive, true));
    return { services };
  },

  async getPartnerOfferings(partnerId: string) {
    const offerings = await db
      .select({
        offering: partnerServiceOfferings,
        service: partnerServices,
      })
      .from(partnerServiceOfferings)
      .innerJoin(partnerServices, eq(partnerServiceOfferings.serviceId, partnerServices.serviceId))
      .where(eq(partnerServiceOfferings.partnerId, partnerId));
    
    return { offerings };
  },

  async getPartnerRelationships(partnerId: string, query: { tenantId?: string; status?: string }) {
    const conditions = [eq(partnerTenantServiceRelationships.partnerId, partnerId)];
    
    if (query.tenantId) {
      conditions.push(eq(partnerTenantServiceRelationships.tenantId, query.tenantId));
    }
    
    if (query.status) {
      conditions.push(eq(partnerTenantServiceRelationships.status, query.status as any));
    }

    const rows = await db
      .select({
        relationship: partnerTenantServiceRelationships,
        service: partnerServices,
        tenant: tenants,
      })
      .from(partnerTenantServiceRelationships)
      .innerJoin(partnerServices, eq(partnerTenantServiceRelationships.serviceId, partnerServices.serviceId))
      .leftJoin(tenants, eq(partnerTenantServiceRelationships.tenantId, tenants.tenantId))
      .where(and(...conditions));

    return { relationships: rows.map(flattenRelationshipRow) };
  },

  async getRelationshipById(relationshipId: string) {
    const [row] = await db
      .select({
        relationship: partnerTenantServiceRelationships,
        service: partnerServices,
        tenant: tenants,
      })
      .from(partnerTenantServiceRelationships)
      .innerJoin(partnerServices, eq(partnerTenantServiceRelationships.serviceId, partnerServices.serviceId))
      .leftJoin(tenants, eq(partnerTenantServiceRelationships.tenantId, tenants.tenantId))
      .where(eq(partnerTenantServiceRelationships.relationshipId, relationshipId))
      .limit(1);

    if (!row) {
      throw new Error('Relationship not found');
    }

    return flattenRelationshipRow(row);
  },

  async createRelationship(data: {
    partnerId: string;
    tenantId: string;
    serviceId: string;
    requestedServices: string[];
    applications?: string[];
    modules?: Record<string, unknown>;
    permissions?: Record<string, unknown>;
    startDate?: string;
    notes?: string;
  }, user: any) {
    let requestedByUser = String(user?.userId || '').trim();
    const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedByUser);
    if (!uuidOk && user?.email) {
      const [admin] = await db
        .select({ adminId: adminUsers.adminId })
        .from(adminUsers)
        .where(eq(adminUsers.email, String(user.email).trim().toLowerCase()))
        .limit(1);
      if (admin) requestedByUser = admin.adminId;
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedByUser)) {
      requestedByUser = '00000000-0000-0000-0000-000000000000';
    }

    const startDateVal =
      data.startDate && /^\d{4}-\d{2}-\d{2}$/.test(data.startDate)
        ? data.startDate
        : data.startDate
          ? data.startDate.slice(0, 10)
          : undefined;

    const [created] = await db
      .insert(partnerTenantServiceRelationships)
      .values({
        partnerId: data.partnerId,
        tenantId: data.tenantId,
        serviceId: data.serviceId,
        requestedServices: data.requestedServices,
        applications: data.applications || [],
        modules: data.modules || {},
        permissions: data.permissions || {},
        startDate: startDateVal as unknown as Date,
        notes: data.notes,
        requestedBy: 'platform_admin',
        requestedByUser,
        status: 'pending',
      })
      .returning();

    const [svc] = await db
      .select()
      .from(partnerServices)
      .where(eq(partnerServices.serviceId, data.serviceId))
      .limit(1);
    const [tn] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, data.tenantId))
      .limit(1);

    return {
      ...created,
      service: svc,
      tenant: tn
        ? {
            tenantId: tn.tenantId,
            tenantCode: tn.tenantCode,
            tenantName: tn.tenantName,
            status: tn.status,
          }
        : undefined,
    };
  },

  async updateRelationship(
    relationshipId: string,
    data: {
      approvedServices?: string[];
      applications?: string[];
      modules?: Record<string, unknown>;
      permissions?: Record<string, unknown>;
      customPermissions?: Record<string, unknown>;
      startDate?: string;
      endDate?: string;
      notes?: string;
    },
    user: any
  ) {
    const [relationship] = await db
      .update(partnerTenantServiceRelationships)
      .set({
        approvedServices: data.approvedServices,
        applications: data.applications,
        modules: data.modules,
        permissions: data.permissions,
        customPermissions: data.customPermissions,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        notes: data.notes,
        updatedAt: new Date(),
      })
      .where(eq(partnerTenantServiceRelationships.relationshipId, relationshipId))
      .returning();
    
    if (!relationship) {
      throw new Error('Relationship not found');
    }
    
    return relationship;
  },

  async approveRelationship(
    relationshipId: string,
    data: {
      approvedBy: 'tenant_admin' | 'partner_admin' | 'platform_admin';
      approvedServices?: string[];
      notes?: string;
    },
    user: any
  ) {
    const updateData: any = {
      approvedServices: data.approvedServices,
      notes: data.notes,
      updatedAt: new Date(),
    };

    if (data.approvedBy === 'tenant_admin') {
      updateData.approvedByTenantAdmin = user.userId;
      updateData.tenantApprovedAt = new Date();
    } else if (data.approvedBy === 'partner_admin') {
      updateData.approvedByPartnerAdmin = user.userId;
      updateData.partnerApprovedAt = new Date();
    } else if (data.approvedBy === 'platform_admin') {
      updateData.approvedByPlatformAdmin = user.userId;
      updateData.platformApprovedAt = new Date();
    }

    // If all three approvals are done, set status to active
    const [current] = await db
      .select()
      .from(partnerTenantServiceRelationships)
      .where(eq(partnerTenantServiceRelationships.relationshipId, relationshipId))
      .limit(1);

    if (current) {
      const hasTenantApproval = !!updateData.approvedByTenantAdmin || !!current.approvedByTenantAdmin;
      const hasPartnerApproval = !!updateData.approvedByPartnerAdmin || !!current.approvedByPartnerAdmin;
      const hasPlatformApproval = !!updateData.approvedByPlatformAdmin || !!current.approvedByPlatformAdmin;

      if (hasTenantApproval && hasPartnerApproval && hasPlatformApproval) {
        updateData.status = 'active';
        updateData.startDate = updateData.startDate || new Date();
      }
    }

    const [relationship] = await db
      .update(partnerTenantServiceRelationships)
      .set(updateData)
      .where(eq(partnerTenantServiceRelationships.relationshipId, relationshipId))
      .returning();
    
    if (!relationship) {
      throw new Error('Relationship not found');
    }
    
    return relationship;
  },

  async terminateRelationship(
    relationshipId: string,
    data: {
      terminationReason: string;
      notes?: string;
    },
    user: any
  ) {
    const [relationship] = await db
      .update(partnerTenantServiceRelationships)
      .set({
        status: 'terminated',
        terminationDate: new Date(),
        terminationReason: data.terminationReason,
        terminationInitiatedBy: user.userId,
        notes: data.notes,
        updatedAt: new Date(),
      })
      .where(eq(partnerTenantServiceRelationships.relationshipId, relationshipId))
      .returning();
    
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    return relationship;
  },

  // ---- catalog management (create/update/delete/bulk import) ----

  async listAllServices() {
    return db.select().from(partnerServices);
  },

  async createService(input: CreateServiceInput) {
    const [service] = await db
      .insert(partnerServices)
      .values({
        serviceCode: input.serviceCode,
        serviceName: input.serviceName,
        serviceCategory: input.serviceCategory,
        description: input.description,
        requiredDocuments: input.requiredDocuments ?? [],
        isActive: input.isActive ?? true,
      })
      .returning();
    return service;
  },

  async updateService(serviceId: string, patch: Partial<CreateServiceInput>) {
    const [service] = await db
      .update(partnerServices)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(partnerServices.serviceId, serviceId))
      .returning();
    return service ?? null;
  },

  async deleteService(serviceId: string) {
    await db.delete(partnerServices).where(eq(partnerServices.serviceId, serviceId));
  },

  /** Bulk-adds catalog entries from an uploaded CSV — the same shape as the category-1 partner importer. */
  async importServicesFromCsv(request: FastifyRequest) {
    const { file } = await collectMultipartUpload(request);
    if (!file) {
      throw new Error('No CSV file uploaded. Send it as multipart form-data under any file field.');
    }

    const rows = parseCsvWithHeader(file.buffer.toString('utf-8'));
    const report = {
      total: rows.length,
      succeeded: 0,
      failed: 0,
      rows: [] as Array<{ row: number; status: 'created' | 'error'; serviceId?: string; error?: string }>,
    };

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2;
      try {
        const parsed = serviceImportRowSchema.parse({
          serviceCode: rows[i].serviceCode,
          serviceName: rows[i].serviceName,
          serviceCategory: rows[i].serviceCategory,
          description: rows[i].description || undefined,
        });
        const created = await this.createService(parsed);
        report.succeeded++;
        report.rows.push({ row: rowNumber, status: 'created', serviceId: created.serviceId });
      } catch (error: any) {
        report.failed++;
        const message =
          error?.issues?.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join('; ') ||
          error?.message ||
          'Unknown error';
        report.rows.push({ row: rowNumber, status: 'error', error: message });
      }
    }

    return report;
  },
};









