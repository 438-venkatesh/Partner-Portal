import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { partnerTenantServiceRelationships, partners, tenants } from '../db/schema';

/**
 * "Account mapping" here means what this platform's own data actually supports today: detecting
 * when two or more partners are both linked to the same tenant, which is exactly the kind of
 * channel conflict Crossbeam-style overlap detection exists to surface — built on the
 * partner-tenant-service relationship table that already existed, not a new CRM-sync concept.
 */
export const accountMappingService = {
  /** Every tenant served by more than one partner right now, with who's serving it. */
  async listOverlaps() {
    const rows = await db
      .select({
        tenantId: partnerTenantServiceRelationships.tenantId,
        partnerId: partnerTenantServiceRelationships.partnerId,
        partnerName: partners.partnerName,
        tenantName: tenants.tenantName,
        status: partnerTenantServiceRelationships.status,
      })
      .from(partnerTenantServiceRelationships)
      .leftJoin(partners, eq(partnerTenantServiceRelationships.partnerId, partners.partnerId))
      .leftJoin(tenants, eq(partnerTenantServiceRelationships.tenantId, tenants.tenantId));

    const byTenant = new Map<
      string,
      { tenantId: string; tenantName: string | null; partners: Array<{ partnerId: string; partnerName: string | null; status: string | null }> }
    >();

    for (const row of rows) {
      if (!byTenant.has(row.tenantId)) {
        byTenant.set(row.tenantId, { tenantId: row.tenantId, tenantName: row.tenantName, partners: [] });
      }
      const entry = byTenant.get(row.tenantId)!;
      if (!entry.partners.some((p) => p.partnerId === row.partnerId)) {
        entry.partners.push({ partnerId: row.partnerId, partnerName: row.partnerName, status: row.status });
      }
    }

    return [...byTenant.values()]
      .filter((t) => t.partners.length > 1)
      .sort((a, b) => b.partners.length - a.partners.length);
  },

  /** Which tenants this partner touches, and — for each one — who else touches it too. */
  async getPartnerAccountMap(partnerId: string) {
    const overlaps = await this.listOverlaps();
    const own = await db
      .select({
        tenantId: partnerTenantServiceRelationships.tenantId,
        tenantName: tenants.tenantName,
        status: partnerTenantServiceRelationships.status,
      })
      .from(partnerTenantServiceRelationships)
      .leftJoin(tenants, eq(partnerTenantServiceRelationships.tenantId, tenants.tenantId))
      .where(eq(partnerTenantServiceRelationships.partnerId, partnerId));

    const seen = new Set<string>();
    const tenantRows = [];
    for (const row of own) {
      if (seen.has(row.tenantId)) continue;
      seen.add(row.tenantId);
      const overlap = overlaps.find((o) => o.tenantId === row.tenantId);
      tenantRows.push({
        tenantId: row.tenantId,
        tenantName: row.tenantName,
        status: row.status,
        sharedWith: overlap ? overlap.partners.filter((p) => p.partnerId !== partnerId) : [],
      });
    }

    return tenantRows;
  },
};
