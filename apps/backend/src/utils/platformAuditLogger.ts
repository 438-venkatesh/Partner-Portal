import { desc, eq, and } from 'drizzle-orm';
import { db } from '../db';
import { platformAuditLogs } from '../db/schema';

type PlatformAction =
  | 'admin_created'
  | 'admin_role_changed'
  | 'admin_deactivated'
  | 'admin_reactivated'
  | 'tenant_created'
  | 'tenant_updated'
  | 'billing_plan_created'
  | 'billing_plan_updated'
  | 'commission_plan_created'
  | 'commission_plan_updated'
  | 'bulk_partner_action'
  | 'bulk_document_action'
  | 'custom_field_created'
  | 'custom_field_updated';

export async function logPlatformAction(input: {
  actorId: string;
  actorEmail?: string | null;
  action: PlatformAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await db.insert(platformAuditLogs).values({
    actorId: input.actorId,
    actorEmail: input.actorEmail ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
    ipAddress: input.ipAddress ?? null,
  });
}

export async function listPlatformActions(opts?: {
  entityType?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(opts?.limit ?? 50, 200);
  const offset = opts?.offset ?? 0;

  const conditions = opts?.entityType ? [eq(platformAuditLogs.entityType, opts.entityType)] : [];

  return db
    .select()
    .from(platformAuditLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(platformAuditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}
