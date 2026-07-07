/**
 * Seeds the global partner_services catalog (product types a tenant can subscribe to via a partner).
 * Idempotent on service_code.
 */
import 'dotenv/config';
import { db, dbPool } from './index';
import { partnerServices } from './schema/services';

/** Stable UUIDs so FK references and re-seeds stay predictable */
const CATALOG = [
  {
    serviceId: 'a1000001-0001-4001-8001-000000000001',
    serviceCode: 'SVC-CRM',
    serviceName: 'CRM Suite',
    serviceCategory: 'Sales',
    description: 'Customer relationship management, pipeline, and contacts.',
    applications: ['crm', 'contacts', 'pipeline'],
    isActive: true,
  },
  {
    serviceId: 'a1000001-0001-4001-8001-000000000002',
    serviceCode: 'SVC-PROJECTS',
    serviceName: 'Project Delivery',
    serviceCategory: 'Operations',
    description: 'Projects, milestones, resource planning.',
    applications: ['projects', 'tasks', 'gantt'],
    isActive: true,
  },
  {
    serviceId: 'a1000001-0001-4001-8001-000000000003',
    serviceCode: 'SVC-OPS',
    serviceName: 'Operations Command',
    serviceCategory: 'Operations',
    description: 'Runbooks, incidents, and operational dashboards.',
    applications: ['ops', 'incidents', 'dashboards'],
    isActive: true,
  },
  {
    serviceId: 'a1000001-0001-4001-8001-000000000004',
    serviceCode: 'SVC-BILLING',
    serviceName: 'Billing & Subscriptions',
    serviceCategory: 'Finance',
    description: 'Invoices, plans, and payment tracking.',
    applications: ['billing', 'invoices'],
    isActive: true,
  },
  {
    serviceId: 'a1000001-0001-4001-8001-000000000005',
    serviceCode: 'SVC-ANALYTICS',
    serviceName: 'Analytics & BI',
    serviceCategory: 'Insights',
    description: 'Reporting, KPIs, and exports.',
    applications: ['reports', 'exports'],
    isActive: true,
  },
  {
    serviceId: 'a1000001-0001-4001-8001-000000000006',
    serviceCode: 'SVC-DOCS',
    serviceName: 'Document Management',
    serviceCategory: 'Content',
    description: 'Secure storage, versioning, and e-sign hooks.',
    applications: ['documents', 'signing'],
    isActive: true,
  },
  {
    serviceId: 'a1000001-0001-4001-8001-000000000007',
    serviceCode: 'SVC-API',
    serviceName: 'API & Integrations',
    serviceCategory: 'Platform',
    description: 'REST/webhooks and integration toolkit.',
    applications: ['api', 'webhooks'],
    isActive: true,
  },
  {
    serviceId: 'a1000001-0001-4001-8001-000000000008',
    serviceCode: 'SVC-SUPPORT',
    serviceName: 'Support Desk',
    serviceCategory: 'Service',
    description: 'Ticketing and SLAs for tenant users.',
    applications: ['tickets', 'sla'],
    isActive: true,
  },
  {
    serviceId: 'a1000001-0001-4001-8001-000000000009',
    serviceCode: 'SVC-HR',
    serviceName: 'HR & Access',
    serviceCategory: 'People',
    description: 'Employee records and access provisioning.',
    applications: ['hr', 'access'],
    isActive: true,
  },
  {
    serviceId: 'a1000001-0001-4001-8001-000000000010',
    serviceCode: 'SVC-LEGACY',
    serviceName: 'Legacy Connector (deprecated)',
    serviceCategory: 'Platform',
    description: 'Deprecated integration path — inactive by default.',
    applications: [],
    isActive: false,
  },
] as const;

async function main() {
  const result = await db
    .insert(partnerServices)
    .values(
      CATALOG.map((row) => ({
        serviceId: row.serviceId,
        serviceCode: row.serviceCode,
        serviceName: row.serviceName,
        serviceCategory: row.serviceCategory,
        description: row.description,
        applications: row.applications,
        isActive: row.isActive,
      }))
    )
    .onConflictDoNothing({ target: partnerServices.serviceCode });

  const inserted = result.rowCount ?? 0;
  console.log(`✅ Service catalog seed: ${inserted} new row(s); conflicts skipped.`);
  console.log(`   Active services in catalog: ${CATALOG.filter((r) => r.isActive).length}`);

  await dbPool.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('❌ seed-service-catalog failed:', e);
  await dbPool.end().catch(() => {});
  process.exit(1);
});
