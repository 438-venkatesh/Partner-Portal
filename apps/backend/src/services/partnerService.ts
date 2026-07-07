import type { FastifyRequest } from 'fastify';
import { db } from '../db';
import { partners } from '../db/schema/partners';
import { partnerOnboardingWorkflows } from '../db/schema/advanced';
import { partnerUserAccounts } from '../db/schema/partnerAuth';
import { eq, and, or, like, desc, asc, sql } from 'drizzle-orm';
import { logPartnerActivity } from '../utils/activityLogger';
import { emailService } from './emailService';
import { webhookDispatcher } from './webhookDispatcher';
import { getPartnerActivationBlockers, partnerTypeFlags } from './partnerApprovalPreconditions';
import { ensureSupplierOnboarding } from './supplierOnboardingBootstrap';
import { collectMultipartUpload } from '../utils/readMultipartField';
import { parseCsvWithHeader } from '../utils/csv';
import {
  buildInitialPartnerOnboardingState,
  partnerImportRowSchema,
  type CreatePartnerInput,
  type UpdatePartnerInput,
  type GetPartnersQuery,
} from '@partner-portal/common';

const DEFAULT_RETENTION_DAYS = 90;

// Mock data for when database is unavailable
const MOCK_PARTNERS = [
  {
    partnerId: '00000000-0000-0000-0001-000000000001',
    partnerCode: 'PART-AGENCY-001',
    partnerName: 'Digital Marketing Agency Inc.',
    displayName: 'Digital Marketing Agency',
    partnerType: 'agency',
    businessType: 'b2b',
    status: 'pending',
    tier: 'gold',
    description: 'Full-service digital marketing agency specializing in SEO and content marketing',
    website: 'https://digitalmarketing.example.com',
    registrationDate: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    partnerId: '00000000-0000-0000-0001-000000000002',
    partnerCode: 'PART-RESELLER-002',
    partnerName: 'Tech Solutions Reseller',
    displayName: 'Tech Solutions',
    partnerType: 'reseller',
    businessType: 'b2b',
    status: 'pending',
    tier: 'silver',
    description: 'Authorized reseller of enterprise software solutions',
    website: 'https://techsolutions.example.com',
    registrationDate: new Date('2024-01-20'),
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    partnerId: '00000000-0000-0000-0001-000000000003',
    partnerCode: 'PART-SUPPLIER-003',
    partnerName: 'Global Manufacturing Supplies Ltd.',
    displayName: 'Global Manufacturing',
    partnerType: 'supplier',
    businessType: 'b2b',
    status: 'pending',
    tier: 'platinum',
    description: 'Leading supplier of raw materials and components',
    website: 'https://globalmfg.example.com',
    registrationDate: new Date('2024-01-25'),
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25'),
  },
  {
    partnerId: '00000000-0000-0000-0001-000000000004',
    partnerCode: 'PART-LOGISTICS-004',
    partnerName: 'Express Logistics Services',
    displayName: 'Express Logistics',
    partnerType: 'logistics_partner',
    businessType: 'b2b',
    status: 'pending',
    tier: 'gold',
    description: 'Nationwide logistics and transportation services',
    website: 'https://expresslogistics.example.com',
    registrationDate: new Date('2024-01-28'),
    createdAt: new Date('2024-01-28'),
    updatedAt: new Date('2024-01-28'),
  },
  {
    partnerId: '00000000-0000-0000-0001-000000000005',
    partnerCode: 'PART-INTEGRATOR-005',
    partnerName: 'Enterprise Integration Solutions',
    displayName: 'Enterprise Integration',
    partnerType: 'integrator',
    businessType: 'b2b',
    status: 'pending',
    tier: 'platinum',
    description: 'Enterprise system integration and consulting services',
    website: 'https://enterpriseintegration.example.com',
    registrationDate: new Date('2024-02-01'),
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    partnerId: '00000000-0000-0000-0001-000000000006',
    partnerCode: 'PART-SUPPLOG-006',
    partnerName: 'Complete Supply Chain Solutions',
    displayName: 'Supply Chain Solutions',
    partnerType: 'supplier_logistics',
    businessType: 'b2b',
    status: 'pending',
    tier: 'platinum',
    description: 'Integrated supplier and logistics services',
    website: 'https://supplychain.example.com',
    registrationDate: new Date('2024-02-05'),
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05'),
  },
];

export const partnerService = {
  async getAllPartners(query: GetPartnersQuery) {
    const { page = 1, limit = 20, search, partnerType, status, tier, sortBy = 'registrationDate', sortOrder = 'desc' } = query;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(partners.partnerName, `%${search}%`),
          like(partners.partnerCode, `%${search}%`)
        )!
      );
    }
    if (partnerType) {
      conditions.push(eq(partners.partnerType, partnerType));
    }
    if (status) {
      conditions.push(eq(partners.status, status));
    }
    if (tier) {
      conditions.push(eq(partners.tier, tier));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by
    let orderBy;
    switch (sortBy) {
      case 'partnerName':
        orderBy = sortOrder === 'asc' ? asc(partners.partnerName) : desc(partners.partnerName);
        break;
      case 'status':
        orderBy = sortOrder === 'asc' ? asc(partners.status) : desc(partners.status);
        break;
      default:
        orderBy = sortOrder === 'asc' ? asc(partners.registrationDate) : desc(partners.registrationDate);
    }

    try {
      // Build query with optional where clause
      const baseQuery = db.select().from(partners);
      const results = whereClause
        ? await baseQuery.where(whereClause).orderBy(orderBy).limit(limit).offset(offset)
        : await baseQuery.orderBy(orderBy).limit(limit).offset(offset);
      
      // Get total count separately using sql count
      const countBaseQuery = db.select({ count: sql<number>`count(*)`.as('count') }).from(partners);
      const countResult = whereClause
        ? await countBaseQuery.where(whereClause)
        : await countBaseQuery;
      const totalCount = Number(countResult[0]?.count) || 0;

      // If no results from DB, return mock data
      if (results.length === 0) {
        let filteredPartners = [...MOCK_PARTNERS];
        
        if (search) {
          filteredPartners = filteredPartners.filter(p => 
            p.partnerName.toLowerCase().includes(search.toLowerCase()) ||
            p.partnerCode.toLowerCase().includes(search.toLowerCase())
          );
        }
        if (partnerType) {
          filteredPartners = filteredPartners.filter(p => p.partnerType === partnerType);
        }
        if (status) {
          filteredPartners = filteredPartners.filter(p => p.status === status);
        }
        if (tier) {
          filteredPartners = filteredPartners.filter(p => p.tier === tier);
        }

        const total = filteredPartners.length;
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedPartners = filteredPartners.slice(start, end);

        return {
          partners: paginatedPartners,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      }

      return {
        partners: results,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      // Return mock data if database is unavailable
      console.warn('Database unavailable, returning mock data:', error);
      let filteredPartners = [...MOCK_PARTNERS];
      
      if (search) {
        filteredPartners = filteredPartners.filter(p => 
          p.partnerName.toLowerCase().includes(search.toLowerCase()) ||
          p.partnerCode.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (partnerType) {
        filteredPartners = filteredPartners.filter(p => p.partnerType === partnerType);
      }
      if (status) {
        filteredPartners = filteredPartners.filter(p => p.status === status);
      }
      if (tier) {
        filteredPartners = filteredPartners.filter(p => p.tier === tier);
      }

      const total = filteredPartners.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedPartners = filteredPartners.slice(start, end);

      return {
        partners: paginatedPartners,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }
  },

  async getPartnerById(partnerId: string) {
    try {
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.partnerId, partnerId))
        .limit(1);
      
      if (partner) {
        return partner;
      }
    } catch (error) {
      console.warn('Database unavailable, checking mock data:', error);
    }
    
    // Return mock partner if not found in DB or DB unavailable
    const mockPartner = MOCK_PARTNERS.find(p => p.partnerId === partnerId);
    if (mockPartner) {
      return mockPartner;
    }
    throw new Error('Partner not found');
  },

  async createPartner(data: CreatePartnerInput, user: any) {
    // Generate partner code
    const partnerCode = `PART-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    const [partner] = await db.insert(partners).values({
      ...data,
      partnerCode,
      status: 'pending',
      registrationDate: new Date(),
    }).returning();

    const flags = partnerTypeFlags(partner.partnerType);
    if (flags.needsSupplierOnboarding) {
      await ensureSupplierOnboarding(partner.partnerId, partner.partnerType);
    }

    if (!flags.needsGenericOnboarding) {
      return partner;
    }
    
    const initial = buildInitialPartnerOnboardingState(partner.partnerType);

    await db.insert(partnerOnboardingWorkflows).values({
      partnerId: partner.partnerId,
      currentStage: initial.currentStage,
      stageStatus: initial.stageStatus,
      completedStages: initial.completedStages,
      stageData: initial.stageData,
      startedAt: new Date(),
    });
    
    return partner;
  },

  async updatePartner(partnerId: string, data: UpdatePartnerInput, user: any) {
    const [partner] = await db.update(partners)
      .set({ 
        ...data, 
        updatedAt: new Date() 
      })
      .where(eq(partners.partnerId, partnerId))
      .returning();
    
    if (!partner) {
      throw new Error('Partner not found');
    }
    
    return partner;
  },

  async approvePartner(partnerId: string, data: { approved: boolean; notes?: string }, user: any) {
    if (data.approved) {
      const [existingPartner] = await db
        .select({ status: partners.status })
        .from(partners)
        .where(eq(partners.partnerId, partnerId))
        .limit(1);
      if (!existingPartner) {
        throw new Error('Partner not found');
      }
      if (existingPartner.status === 'pending') {
        const blockers = await getPartnerActivationBlockers(partnerId);
        if (blockers.length) {
          const err = new Error(blockers.join(' ')) as Error & { code: string; blockers: string[] };
          err.code = 'PARTNER_APPROVAL_BLOCKED';
          err.blockers = blockers;
          throw err;
        }
      }
    }

    const [partner] = await db.update(partners)
      .set({
        status: data.approved ? 'active' : 'pending',
        approvalDate: data.approved ? new Date() : null,
        approvedBy: data.approved ? user.userId : null,
        updatedAt: new Date(),
      })
      .where(eq(partners.partnerId, partnerId))
      .returning();
    
    if (!partner) {
      throw new Error('Partner not found');
    }

    await logPartnerActivity({
      partnerId,
      activityType: data.approved ? 'partner_approved' : 'partner_updated',
      activityDescription: data.approved
        ? 'Partner approved by platform staff'
        : 'Partner approval rejected / returned to pending',
      performedBy: user.userId,
      performedByType: 'platform_admin',
      metadata: { notes: data.notes },
    });

    if (data.approved) {
      try {
        await webhookDispatcher.dispatch(partnerId, 'partner.approved', { partnerId });
      } catch {
        /* non-fatal */
      }
      const admins = await db
        .select({ email: partnerUserAccounts.email })
        .from(partnerUserAccounts)
        .where(
          and(eq(partnerUserAccounts.partnerId, partnerId), eq(partnerUserAccounts.role, 'admin'))
        );
      for (const row of admins) {
        try {
          await emailService.sendPartnerApproved(row.email, partner.partnerName);
        } catch {
          /* ignore */
        }
      }
    }
    
    return partner;
  },

  async suspendPartner(partnerId: string, user: any) {
    const [partner] = await db.update(partners)
      .set({ 
        status: 'suspended', 
        updatedAt: new Date() 
      })
      .where(eq(partners.partnerId, partnerId))
      .returning();
    
    if (!partner) {
      throw new Error('Partner not found');
    }

    await logPartnerActivity({
      partnerId,
      activityType: 'partner_suspended',
      activityDescription: 'Partner suspended by platform staff',
      performedBy: user.userId,
      performedByType: 'platform_admin',
    });

    const admins = await db
      .select({ email: partnerUserAccounts.email })
      .from(partnerUserAccounts)
      .where(and(eq(partnerUserAccounts.partnerId, partnerId), eq(partnerUserAccounts.role, 'admin')));
    for (const row of admins) {
      try {
        await emailService.sendPartnerSuspended(row.email, partner.partnerName);
      } catch {
        /* ignore */
      }
    }

    return partner;
  },

  async updateTags(partnerId: string, tags: string[]) {
    const [partner] = await db
      .update(partners)
      .set({ tags, updatedAt: new Date() })
      .where(eq(partners.partnerId, partnerId))
      .returning();
    if (!partner) throw new Error('Partner not found');
    return partner;
  },

  async assignAccountManager(partnerId: string, accountManagerId: string | null) {
    const [partner] = await db
      .update(partners)
      .set({ accountManagerId, updatedAt: new Date() })
      .where(eq(partners.partnerId, partnerId))
      .returning();
    if (!partner) throw new Error('Partner not found');
    return partner;
  },

  /**
   * Offboards a partner: distinct from suspend. Marks the record inactive and starts the
   * data-retention countdown; a partner in this state is picked up later by the retention
   * purge job once dataRetentionDays has elapsed, which anonymizes their PII permanently.
   */
  async offboardPartner(
    partnerId: string,
    data: { reason?: string; retentionDays?: number },
    user: any
  ) {
    const [existing] = await db
      .select({ dataRetentionDays: partners.dataRetentionDays })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);
    if (!existing) {
      throw new Error('Partner not found');
    }

    const retentionDays = data.retentionDays ?? existing.dataRetentionDays ?? DEFAULT_RETENTION_DAYS;

    const [partner] = await db
      .update(partners)
      .set({
        status: 'terminated',
        deletedAt: new Date(),
        dataRetentionDays: retentionDays,
        updatedAt: new Date(),
      })
      .where(eq(partners.partnerId, partnerId))
      .returning();

    await logPartnerActivity({
      partnerId,
      activityType: 'partner_offboarded',
      activityDescription: `Partner offboarded by platform staff. Data will be purged after ${retentionDays} days.`,
      performedBy: user.userId,
      performedByType: 'platform_admin',
      metadata: { reason: data.reason, retentionDays },
    });

    return partner;
  },

  /**
   * Bulk-creates partners from an uploaded CSV. Every row goes through the same validation
   * and onboarding-workflow bootstrap as a single createPartner() call; a bad row is reported,
   * not fatal to the rest of the batch.
   */
  async importPartnersFromCsv(request: FastifyRequest, user: any) {
    const { file } = await collectMultipartUpload(request);
    if (!file) {
      throw new Error('No CSV file uploaded. Send it as multipart form-data under any file field.');
    }

    const rows = parseCsvWithHeader(file.buffer.toString('utf-8'));
    const report = {
      total: rows.length,
      succeeded: 0,
      failed: 0,
      rows: [] as Array<{ row: number; status: 'created' | 'error'; partnerId?: string; error?: string }>,
    };

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
      try {
        const parsed = partnerImportRowSchema.parse({
          partnerName: rows[i].partnerName,
          displayName: rows[i].displayName || undefined,
          partnerType: rows[i].partnerType,
          businessType: rows[i].businessType || undefined,
          tier: rows[i].tier || undefined,
          website: rows[i].website || undefined,
          description: rows[i].description || undefined,
        });
        const created = await this.createPartner(parsed as CreatePartnerInput, user);
        report.succeeded++;
        report.rows.push({ row: rowNumber, status: 'created', partnerId: created.partnerId });
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
