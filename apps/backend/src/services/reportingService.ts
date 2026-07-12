import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { partners, deals, leads, commissionRecords, mdfRequests } from '../db/schema';
import { toCsv } from '../utils/csv';

export interface ReportFilters {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface ReportEntity {
  label: string;
  columns: string[];
  createdAtColumn: any;
  statusColumn: any;
  table: any;
}

/**
 * No-code report builder: a fixed registry of exportable entities, each with a column allow-list
 * and its own status/date columns for the shared filter bar. "No-code" here means picking an
 * entity, columns, and filters from the UI — not an arbitrary cross-table query engine.
 */
const ENTITIES: Record<string, ReportEntity> = {
  partners: {
    label: 'Partners',
    columns: ['partnerId', 'partnerCode', 'partnerName', 'partnerType', 'status', 'tier', 'createdAt'],
    createdAtColumn: partners.createdAt,
    statusColumn: partners.status,
    table: partners,
  },
  deals: {
    label: 'Deals',
    columns: [
      'dealId', 'partnerId', 'customerName', 'dealName', 'estimatedValue', 'actualValue',
      'currency', 'status', 'createdAt', 'resolvedAt',
    ],
    createdAtColumn: deals.createdAt,
    statusColumn: deals.status,
    table: deals,
  },
  leads: {
    label: 'Leads',
    columns: ['leadId', 'customerName', 'contactEmail', 'assignedPartnerId', 'status', 'source', 'createdAt'],
    createdAtColumn: leads.createdAt,
    statusColumn: leads.status,
    table: leads,
  },
  commissions: {
    label: 'Commission records',
    columns: ['recordId', 'partnerId', 'dealId', 'type', 'amount', 'currency', 'status', 'createdAt', 'paidAt'],
    createdAtColumn: commissionRecords.createdAt,
    statusColumn: commissionRecords.status,
    table: commissionRecords,
  },
  mdfRequests: {
    label: 'MDF requests',
    columns: [
      'requestId', 'partnerId', 'fundId', 'campaignName', 'requestedAmount', 'approvedAmount',
      'status', 'createdAt',
    ],
    createdAtColumn: mdfRequests.createdAt,
    statusColumn: mdfRequests.status,
    table: mdfRequests,
  },
};

export const reportingService = {
  listEntities() {
    return Object.entries(ENTITIES).map(([key, e]) => ({ key, label: e.label, columns: e.columns }));
  },

  async exportCsv(entityKey: string, filters: ReportFilters, columns?: string[]): Promise<{ csv: string; label: string }> {
    const entity = ENTITIES[entityKey];
    if (!entity) throw new Error(`Unknown report entity: ${entityKey}`);

    const conditions = [];
    if (filters.status) conditions.push(eq(entity.statusColumn, filters.status));
    if (filters.dateFrom) conditions.push(gte(entity.createdAtColumn, filters.dateFrom));
    if (filters.dateTo) conditions.push(lte(entity.createdAtColumn, filters.dateTo));

    const rows = conditions.length
      ? await db.select().from(entity.table).where(and(...conditions))
      : await db.select().from(entity.table);

    const selectedColumns = columns?.length ? columns.filter((c) => entity.columns.includes(c)) : entity.columns;
    return { csv: toCsv(rows, selectedColumns), label: entity.label };
  },
};
