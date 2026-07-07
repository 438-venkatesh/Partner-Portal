import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { tenants } from '../db/schema';

export const tenantService = {
  async list() {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  },

  async getById(tenantId: string) {
    const [row] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    return row ?? null;
  },

  async create(data: {
    tenantCode: string;
    tenantName: string;
    industry?: string;
    contactEmail?: string;
  }) {
    const [row] = await db
      .insert(tenants)
      .values({
        tenantCode: data.tenantCode,
        tenantName: data.tenantName,
        industry: data.industry,
        contactEmail: data.contactEmail,
      })
      .returning();
    return row;
  },

  async update(
    tenantId: string,
    data: Partial<{
      tenantName: string;
      industry: string;
      contactEmail: string;
      status: 'active' | 'inactive' | 'suspended';
    }>
  ) {
    const [row] = await db
      .update(tenants)
      .set(data as any)
      .where(eq(tenants.tenantId, tenantId))
      .returning();
    return row ?? null;
  },
};
