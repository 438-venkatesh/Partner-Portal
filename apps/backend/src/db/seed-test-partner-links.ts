/**
 * Creates active partner↔tenant↔service rows for test.partner@example.com so the
 * partner portal Tenants / Create timeline pages have data.
 *
 * Prereqs: test partner exists (create-test-partner), tenants seed, service catalog seed.
 * Idempotent: skips insert if the same partner+tenant+service link already exists; ensures status active.
 */
import 'dotenv/config';
import { db, dbPool } from './index';
import { partnerUserAccounts } from './schema/partnerAuth';
import { tenants } from './schema/tenants';
import { partnerTenantServiceRelationships, partnerServices } from './schema/services';
import { and, eq } from 'drizzle-orm';

const TEST_EMAIL = 'test.partner@example.com';
const DEMO_TENANT_CODE = 'TEN-SEED-001';
const DEMO_SERVICE_CODE = 'SVC-CRM';

async function main() {
  const [acct] = await db
    .select()
    .from(partnerUserAccounts)
    .where(eq(partnerUserAccounts.email, TEST_EMAIL))
    .limit(1);

  if (!acct) {
    console.error(`No partner_user_accounts row for ${TEST_EMAIL}. Run: pnpm exec tsx src/db/create-test-partner.ts`);
    process.exit(1);
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantCode, DEMO_TENANT_CODE)).limit(1);
  if (!tenant) {
    console.error(`No tenant ${DEMO_TENANT_CODE}. Run: pnpm --filter @partner-portal/backend db:seed-tenants`);
    process.exit(1);
  }

  const [svc] = await db
    .select()
    .from(partnerServices)
    .where(eq(partnerServices.serviceCode, DEMO_SERVICE_CODE))
    .limit(1);
  if (!svc) {
    console.error(`No service ${DEMO_SERVICE_CODE}. Run: pnpm --filter @partner-portal/backend db:seed-service-catalog`);
    process.exit(1);
  }

  const existing = await db
    .select()
    .from(partnerTenantServiceRelationships)
    .where(
      and(
        eq(partnerTenantServiceRelationships.partnerId, acct.partnerId),
        eq(partnerTenantServiceRelationships.tenantId, tenant.tenantId),
        eq(partnerTenantServiceRelationships.serviceId, svc.serviceId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(partnerTenantServiceRelationships)
      .set({
        status: 'active',
        startDate: new Date().toISOString().slice(0, 10) as unknown as Date,
        updatedAt: new Date(),
      })
      .where(eq(partnerTenantServiceRelationships.relationshipId, existing[0].relationshipId));
    console.log('✅ Relationship already existed; set status to active and refreshed start_date.');
  } else {
    await db.insert(partnerTenantServiceRelationships).values({
      partnerId: acct.partnerId,
      tenantId: tenant.tenantId,
      serviceId: svc.serviceId,
      status: 'active',
      requestedBy: 'platform_admin',
      requestedByUser: acct.accountId,
      requestedServices: [svc.serviceCode],
      approvedServices: [svc.serviceCode],
      startDate: new Date().toISOString().slice(0, 10) as unknown as Date,
      notes: 'Dev seed: link test partner to demo tenant for portal QA',
    });
    console.log('✅ Inserted active partner_tenant_service_relationship for test partner + demo tenant + CRM.');
  }

  console.log(`   partnerId=${acct.partnerId}`);
  console.log(`   tenant=${tenant.tenantName} (${tenant.tenantCode})`);
  console.log(`   service=${svc.serviceName} (${svc.serviceCode})`);
  await dbPool.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('❌ seed-test-partner-links failed:', e);
  await dbPool.end().catch(() => {});
  process.exit(1);
});
