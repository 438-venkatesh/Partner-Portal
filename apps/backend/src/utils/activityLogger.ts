import { desc, eq, and } from 'drizzle-orm';
import { db } from '../db';
import { partnerActivityLogs } from '../db/schema';

type ActivityType =
  | 'partner_created'
  | 'partner_updated'
  | 'partner_approved'
  | 'partner_suspended'
  | 'service_added'
  | 'service_removed'
  | 'document_uploaded'
  | 'document_verified'
  | 'agreement_signed'
  | 'permission_changed'
  | 'user_assigned'
  | 'user_removed'
  | 'status_changed'
  | 'onboarding_stage_completed'
  | 'other';

export async function logPartnerActivity(input: {
  partnerId: string;
  tenantId?: string | null;
  activityType: ActivityType;
  activityDescription: string;
  performedBy: string;
  performedByType: 'partner_user' | 'tenant_user' | 'platform_admin';
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await db.insert(partnerActivityLogs).values({
    partnerId: input.partnerId,
    tenantId: input.tenantId ?? null,
    activityType: input.activityType,
    activityDescription: input.activityDescription,
    performedBy: input.performedBy,
    performedByType: input.performedByType,
    metadata: input.metadata ?? {},
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
}

export async function listPartnerActivity(partnerId: string, opts?: { limit?: number; offset?: number }) {
  const limit = Math.min(opts?.limit ?? 50, 200);
  const offset = opts?.offset ?? 0;

  return db
    .select()
    .from(partnerActivityLogs)
    .where(eq(partnerActivityLogs.partnerId, partnerId))
    .orderBy(desc(partnerActivityLogs.createdAt))
    .limit(limit)
    .offset(offset);
}
