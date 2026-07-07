/**
 * Seeds 10 demo tenants (idempotent on tenant_code via ON CONFLICT DO NOTHING).
 */
import 'dotenv/config';
import { db, dbPool } from './index';
import { tenants } from './schema/tenants';

const SEED_ROWS = [
  {
    tenantCode: 'TEN-SEED-001',
    tenantName: 'Northwind Trading Co.',
    industry: 'Retail',
    contactEmail: 'ops@northwind-seed.example',
    status: 'active' as const,
  },
  {
    tenantCode: 'TEN-SEED-002',
    tenantName: 'Contoso Manufacturing Ltd.',
    industry: 'Manufacturing',
    contactEmail: 'contact@contoso-seed.example',
    status: 'active' as const,
  },
  {
    tenantCode: 'TEN-SEED-003',
    tenantName: 'Fabrikam Logistics LLC',
    industry: 'Logistics',
    contactEmail: 'hello@fabrikam-seed.example',
    status: 'active' as const,
  },
  {
    tenantCode: 'TEN-SEED-004',
    tenantName: 'Adventure Works Healthcare',
    industry: 'Healthcare',
    contactEmail: 'admin@adventure-seed.example',
    status: 'active' as const,
  },
  {
    tenantCode: 'TEN-SEED-005',
    tenantName: 'Tailspin Aerospace',
    industry: 'Aerospace',
    contactEmail: 'info@tailspin-seed.example',
    status: 'inactive' as const,
  },
  {
    tenantCode: 'TEN-SEED-006',
    tenantName: 'Wide World Importers',
    industry: 'Wholesale',
    contactEmail: 'sales@wideworld-seed.example',
    status: 'active' as const,
  },
  {
    tenantCode: 'TEN-SEED-007',
    tenantName: 'Blue Yonder Analytics',
    industry: 'Technology',
    contactEmail: 'team@blueyonder-seed.example',
    status: 'active' as const,
  },
  {
    tenantCode: 'TEN-SEED-008',
    tenantName: 'Litware Financial Group',
    industry: 'Financial Services',
    contactEmail: 'support@litware-seed.example',
    status: 'suspended' as const,
  },
  {
    tenantCode: 'TEN-SEED-009',
    tenantName: 'Woodgrove Bank (Pilot)',
    industry: 'Banking',
    contactEmail: 'pilot@woodgrove-seed.example',
    status: 'active' as const,
  },
  {
    tenantCode: 'TEN-SEED-010',
    tenantName: 'Alpine Ski House Resorts',
    industry: 'Hospitality',
    contactEmail: 'bookings@alpine-seed.example',
    status: 'active' as const,
  },
];

async function main() {
  const result = await db
    .insert(tenants)
    .values(SEED_ROWS)
    .onConflictDoNothing({ target: tenants.tenantCode });

  const inserted = result.rowCount ?? 0;
  console.log(`✅ Tenant seed finished (${inserted} new row(s) inserted; conflicts skipped).`);
  console.log('   Codes:', SEED_ROWS.map((r) => r.tenantCode).join(', '));

  await dbPool.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('❌ seed-tenants failed:', e);
  await dbPool.end().catch(() => {});
  process.exit(1);
});
