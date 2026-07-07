/**
 * Creates one partner per partner_type with active login + correct onboarding workflows.
 * Runs onboarding GET/UPDATE/read-back checks for each workflow type.
 *
 * Run: pnpm --filter @partner-portal/backend db:seed-all-partner-types
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { db, dbPool } from './index';
import { partners } from './schema/partners';
import { partnerUserAccounts } from './schema/partnerAuth';
import {
  partnerOnboardingWorkflows,
  supplierOnboardingWorkflows,
  logisticsOnboardingWorkflows,
} from './schema/advanced';
import { suppliers } from './schema/suppliers';
import { supplierProducts } from './schema/products';
import { logisticsPartners } from './schema/logistics';
import { tenants } from './schema/tenants';
import { partnerTenantServiceRelationships, partnerServices } from './schema/services';
import {
  onboardingService,
  isPartnerOnboardingComplete,
} from '../services/onboardingService';
import {
  buildInitialPartnerOnboardingState,
  getPartnerOnboardingStageOrder,
} from '@partner-portal/common';
import {
  supplierOnboardingService,
  SUPPLIER_ONBOARDING_STAGE_ORDER,
  isSupplierOnboardingComplete,
} from '../services/supplierOnboardingService';
import {
  logisticsOnboardingService,
  LOGISTICS_ONBOARDING_STAGE_ORDER,
  isLogisticsOnboardingComplete,
} from '../services/logisticsOnboardingService';
import { getPartnerActivationBlockers } from '../services/partnerApprovalPreconditions';

const SHARED_PASSWORD = 'OnboardTest2026!';
const MOCK_ADMIN_USER = { userId: '00000000-0000-0000-0000-000000000000', email: 'admin@operations.local' };

const SERVICE_PARTNER_TYPES = ['agency', 'reseller', 'integrator', 'consultant', 'affiliate'] as const;

type PartnerType =
  | (typeof SERVICE_PARTNER_TYPES)[number]
  | 'supplier'
  | 'logistics_partner'
  | 'supplier_logistics';

const PARTNER_SPECS: Array<{
  partnerType: PartnerType;
  email: string;
  partnerName: string;
  displayName: string;
}> = [
  { partnerType: 'agency', email: 'onboard.agency@example.com', partnerName: 'Onboard Test Agency', displayName: 'OTA Agency' },
  { partnerType: 'reseller', email: 'onboard.reseller@example.com', partnerName: 'Onboard Test Reseller', displayName: 'OTR Reseller' },
  { partnerType: 'integrator', email: 'onboard.integrator@example.com', partnerName: 'Onboard Test Integrator', displayName: 'OTI Integrator' },
  { partnerType: 'consultant', email: 'onboard.consultant@example.com', partnerName: 'Onboard Test Consultant', displayName: 'OTC Consultant' },
  { partnerType: 'affiliate', email: 'onboard.affiliate@example.com', partnerName: 'Onboard Test Affiliate', displayName: 'OTF Affiliate' },
  { partnerType: 'supplier', email: 'onboard.supplier@example.com', partnerName: 'Onboard Test Supplier', displayName: 'OTS Supplier' },
  { partnerType: 'logistics_partner', email: 'onboard.logistics@example.com', partnerName: 'Onboard Test Logistics', displayName: 'OTL Logistics' },
  {
    partnerType: 'supplier_logistics',
    email: 'onboard.supplier-logistics@example.com',
    partnerName: 'Onboard Test Supplier Logistics',
    displayName: 'OTSL Combined',
  },
];

function needsGeneric(partnerType: PartnerType): boolean {
  return (SERVICE_PARTNER_TYPES as readonly string[]).includes(partnerType);
}

function needsSupplier(partnerType: PartnerType): boolean {
  return partnerType === 'supplier' || partnerType === 'supplier_logistics';
}

function needsLogistics(partnerType: PartnerType): boolean {
  return partnerType === 'logistics_partner' || partnerType === 'supplier_logistics';
}

async function upsertPartnerAccount(spec: (typeof PARTNER_SPECS)[number]) {
  const passwordHash = await bcrypt.hash(SHARED_PASSWORD, 10);

  const [existingAccount] = await db
    .select()
    .from(partnerUserAccounts)
    .where(eq(partnerUserAccounts.email, spec.email.toLowerCase()))
    .limit(1);

  if (existingAccount) {
    await db
      .update(partnerUserAccounts)
      .set({
        status: 'active',
        emailVerified: true,
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(partnerUserAccounts.accountId, existingAccount.accountId));

    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.partnerId, existingAccount.partnerId))
      .limit(1);

    if (!partner) throw new Error(`Account exists but partner missing for ${spec.email}`);
    return { partner, account: existingAccount, created: false };
  }

  const partnerCode = `PART-ONBOARD-${spec.partnerType.toUpperCase().replace(/_/g, '-')}-${Date.now().toString(36).slice(-4)}`;

  const [partner] = await db
    .insert(partners)
    .values({
      partnerCode,
      partnerName: spec.partnerName,
      displayName: spec.displayName,
      partnerType: spec.partnerType,
      businessType: 'b2b',
      website: `https://${spec.partnerType.replace(/_/g, '-')}.onboard.example.com`,
      description: `Seed partner for onboarding QA (${spec.partnerType})`,
      status: 'pending',
    })
    .returning();

  const [account] = await db
    .insert(partnerUserAccounts)
    .values({
      partnerId: partner.partnerId,
      email: spec.email.toLowerCase(),
      passwordHash,
      status: 'active',
      emailVerified: true,
      role: 'admin',
      firstName: 'Onboard',
      lastName: spec.partnerType.replace(/_/g, ' '),
    })
    .returning();

  return { partner, account, created: true };
}

const DEMO_TENANT_CODE = 'TEN-SEED-001';
const DEMO_SERVICE_CODE = 'SVC-CRM';

async function ensureActiveTenantLink(partnerId: string, accountId: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantCode, DEMO_TENANT_CODE)).limit(1);
  const [svc] = await db
    .select()
    .from(partnerServices)
    .where(eq(partnerServices.serviceCode, DEMO_SERVICE_CODE))
    .limit(1);

  if (!tenant || !svc) {
    console.warn(
      `  ⚠️  Skip tenant link (missing ${!tenant ? DEMO_TENANT_CODE : ''} ${!svc ? DEMO_SERVICE_CODE : ''}) — run db:seed-tenants + db:seed-service-catalog`
    );
    return;
  }

  const [existing] = await db
    .select()
    .from(partnerTenantServiceRelationships)
    .where(
      and(
        eq(partnerTenantServiceRelationships.partnerId, partnerId),
        eq(partnerTenantServiceRelationships.tenantId, tenant.tenantId),
        eq(partnerTenantServiceRelationships.serviceId, svc.serviceId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(partnerTenantServiceRelationships)
      .set({
        status: 'active',
        startDate: new Date().toISOString().slice(0, 10) as unknown as Date,
        updatedAt: new Date(),
      })
      .where(eq(partnerTenantServiceRelationships.relationshipId, existing.relationshipId));
    return;
  }

  await db.insert(partnerTenantServiceRelationships).values({
    partnerId,
    tenantId: tenant.tenantId,
    serviceId: svc.serviceId,
    status: 'active',
    requestedBy: 'platform_admin',
    requestedByUser: accountId,
    requestedServices: [svc.serviceCode],
    approvedServices: [svc.serviceCode],
    startDate: new Date().toISOString().slice(0, 10) as unknown as Date,
    notes: 'Seed: active tenant link for service partner portal QA',
  });
}

async function ensureGenericOnboarding(partnerId: string, partnerType: string) {
  const [existing] = await db
    .select()
    .from(partnerOnboardingWorkflows)
    .where(eq(partnerOnboardingWorkflows.partnerId, partnerId))
    .limit(1);

  const initial = buildInitialPartnerOnboardingState(partnerType);

  if (existing) {
    await db
      .update(partnerOnboardingWorkflows)
      .set({
        currentStage: initial.currentStage,
        stageStatus: initial.stageStatus,
        completedStages: initial.completedStages,
        stageData: initial.stageData,
        blockedReasons: null,
        updatedAt: new Date(),
      })
      .where(eq(partnerOnboardingWorkflows.partnerId, partnerId));
    return;
  }

  await db.insert(partnerOnboardingWorkflows).values({
    partnerId,
    currentStage: initial.currentStage,
    stageStatus: initial.stageStatus,
    completedStages: initial.completedStages,
    stageData: initial.stageData,
    startedAt: new Date(),
  });
}

async function ensureSupplierRecord(partnerId: string) {
  const [existing] = await db.select().from(suppliers).where(eq(suppliers.partnerId, partnerId)).limit(1);
  if (existing) return existing;

  const [row] = await db
    .insert(suppliers)
    .values({
      partnerId,
      supplierCode: `SUP-ONBOARD-${Date.now().toString(36).slice(-6).toUpperCase()}`,
      supplierCategory: 'services',
      supplierTier: 'standard',
      paymentTerms: 'net_30',
      supplierPortalEnabled: true,
    })
    .returning();
  return row;
}

async function ensureLogisticsRecord(partnerId: string) {
  const [existing] = await db
    .select()
    .from(logisticsPartners)
    .where(eq(logisticsPartners.partnerId, partnerId))
    .limit(1);
  if (existing) return existing;

  const [row] = await db
    .insert(logisticsPartners)
    .values({
      partnerId,
      logisticsCode: `LOG-ONBOARD-${Date.now().toString(36).slice(-6).toUpperCase()}`,
      logisticsType: '3pl',
      serviceCapabilities: ['transportation', 'warehousing'],
      fleetSize: 5,
      trackingCapabilities: true,
      logisticsPortalEnabled: true,
    })
    .returning();
  return row;
}

async function ensureSupplierOnboardingPersisted(supplierId: string) {
  await supplierOnboardingService.updateStage(
    supplierId,
    { stage: 'supplier_registration', status: 'in_progress', notes: 'Seed init' },
    MOCK_ADMIN_USER,
  );
}

async function ensureLogisticsOnboardingPersisted(logisticsId: string) {
  await logisticsOnboardingService.updateStage(
    logisticsId,
    { stage: 'logistics_registration', status: 'in_progress', notes: 'Seed init' },
    MOCK_ADMIN_USER,
  );
}

async function exerciseGenericOnboardingCrud(
  partnerId: string,
  label: string,
  partnerType: string
): Promise<string[]> {
  const errors: string[] = [];
  const order = getPartnerOnboardingStageOrder(partnerType);
  const first = order[0];
  const second = order[1];
  if (!first || !second) {
    errors.push(`[${label}] partner type ${partnerType} has fewer than 2 onboarding stages`);
    return errors;
  }

  let wf = await onboardingService.getWorkflow(partnerId);
  if (wf.currentStage !== first) {
    errors.push(`[${label}] expected currentStage ${first}, got ${wf.currentStage}`);
  }

  await onboardingService.updateStage(
    partnerId,
    { stage: first, status: 'completed', notes: 'CRUD test complete' },
    MOCK_ADMIN_USER,
  );

  wf = await onboardingService.getWorkflow(partnerId);
  if (!wf.completedStages.includes(first)) {
    errors.push(`[${label}] ${first} not in completedStages after update`);
  }

  await onboardingService.updateStage(
    partnerId,
    { stage: second, status: 'in_progress', notes: 'CRUD test in progress' },
    MOCK_ADMIN_USER,
  );

  wf = await onboardingService.getWorkflow(partnerId);
  if (wf.stages[second]?.status !== 'in_progress' && wf.currentStage !== second) {
    errors.push(`[${label}] ${second} not in_progress after update`);
  }

  if (isPartnerOnboardingComplete(wf, partnerType)) {
    errors.push(`[${label}] workflow should not be complete after 1 stage`);
  }

  return errors;
}

async function exerciseSupplierOnboardingCrud(supplierId: string, label: string): Promise<string[]> {
  const errors: string[] = [];
  const stages = SUPPLIER_ONBOARDING_STAGE_ORDER;

  for (const stage of stages) {
    await supplierOnboardingService.updateStage(
      supplierId,
      { stage, status: 'completed', notes: `CRUD test ${stage}` },
      MOCK_ADMIN_USER,
    );
    const wf = await supplierOnboardingService.getWorkflow(supplierId);
    if (!wf.completedStages.includes(stage)) {
      errors.push(`[${label}] supplier stage ${stage} missing from completedStages`);
    }
  }

  const final = await supplierOnboardingService.getWorkflow(supplierId);
  if (!isSupplierOnboardingComplete(final)) {
    errors.push(`[${label}] supplier workflow should be complete after all stages`);
  }

  return errors;
}

async function exerciseLogisticsOnboardingCrud(logisticsId: string, label: string): Promise<string[]> {
  const errors: string[] = [];
  const stages = LOGISTICS_ONBOARDING_STAGE_ORDER;

  for (const stage of stages) {
    await logisticsOnboardingService.updateStage(
      logisticsId,
      { stage, status: 'completed', notes: `CRUD test ${stage}` },
      MOCK_ADMIN_USER,
    );
    const wf = await logisticsOnboardingService.getWorkflow(logisticsId);
    if (!wf.completedStages.includes(stage)) {
      errors.push(`[${label}] logistics stage ${stage} missing from completedStages`);
    }
  }

  const final = await logisticsOnboardingService.getWorkflow(logisticsId);
  if (!isLogisticsOnboardingComplete(final)) {
    errors.push(`[${label}] logistics workflow should be complete after all stages`);
  }

  return errors;
}

/** Reset generic workflow to registration in_progress for UI testing (after CRUD completed all stages). */
async function resetGenericOnboardingForUi(partnerId: string, partnerType: string) {
  const initial = buildInitialPartnerOnboardingState(partnerType);
  await db
    .update(partnerOnboardingWorkflows)
    .set({
      currentStage: initial.currentStage,
      stageStatus: initial.stageStatus,
      completedStages: initial.completedStages,
      stageData: initial.stageData,
      blockedReasons: null,
      updatedAt: new Date(),
    })
    .where(eq(partnerOnboardingWorkflows.partnerId, partnerId));
}

async function resetSupplierOnboardingForUi(supplierId: string) {
  const stageData: Record<string, { status: string }> = {};
  SUPPLIER_ONBOARDING_STAGE_ORDER.forEach((stage, index) => {
    stageData[stage] = { status: index === 0 ? 'in_progress' : 'pending' };
  });
  await db
    .update(supplierOnboardingWorkflows)
    .set({
      currentStage: 'supplier_registration',
      stageStatus: 'in_progress',
      completedStages: [],
      stageData,
      blockedReasons: null,
      updatedAt: new Date(),
    })
    .where(eq(supplierOnboardingWorkflows.supplierId, supplierId));
}

/** Demo states for manual QA in partner portal (after CRUD reset). */
async function seedPartialSupplierDemo(supplierId: string, mode: 'catalog_in_progress' | 'documentation') {
  if (mode === 'catalog_in_progress') {
    await db
      .update(supplierOnboardingWorkflows)
      .set({
        currentStage: 'catalog_setup',
        stageStatus: 'in_progress',
        completedStages: ['supplier_registration'],
        stageData: {
          supplier_registration: { status: 'completed', acceptedTerms: true },
          catalog_setup: { status: 'in_progress' },
        },
        updatedAt: new Date(),
      })
      .where(eq(supplierOnboardingWorkflows.supplierId, supplierId));

    const demoProducts = [
      { code: 'OTS-SKU-001', name: 'Industrial bolt kit M8', category: 'components' as const, price: '24.99' },
      { code: 'OTS-SKU-002', name: 'Stainless steel washer pack', category: 'mro' as const, price: '12.50' },
      { code: 'OTS-SKU-003', name: 'Hydraulic hose assembly', category: 'finished_goods' as const, price: '89.00' },
      { code: 'OTS-SKU-004', name: 'Safety gloves (box of 100)', category: 'mro' as const, price: '45.00' },
      { code: 'OTS-SKU-005', name: 'Aluminum mounting bracket', category: 'components' as const, price: '18.75' },
    ];
    for (const p of demoProducts) {
      await db.insert(supplierProducts).values({
        supplierId,
        productCode: p.code,
        productName: p.name,
        productCategory: p.category,
        unitPrice: p.price,
        currency: 'USD',
        unitOfMeasure: 'each',
        minimumOrderQuantity: '1',
        status: 'pending_approval',
        isActive: true,
      });
    }
    return;
  }

  await db
    .update(supplierOnboardingWorkflows)
    .set({
      currentStage: 'supplier_documentation',
      stageStatus: 'in_progress',
      completedStages: ['supplier_registration', 'catalog_setup'],
      stageData: {
        supplier_registration: { status: 'completed' },
        catalog_setup: { status: 'completed' },
        supplier_documentation: { status: 'in_progress' },
      },
      updatedAt: new Date(),
    })
    .where(eq(supplierOnboardingWorkflows.supplierId, supplierId));
}

async function resetLogisticsOnboardingForUi(logisticsId: string) {
  const stageData: Record<string, { status: string }> = {};
  LOGISTICS_ONBOARDING_STAGE_ORDER.forEach((stage, index) => {
    stageData[stage] = { status: index === 0 ? 'in_progress' : 'pending' };
  });
  await db
    .update(logisticsOnboardingWorkflows)
    .set({
      currentStage: 'logistics_registration',
      stageStatus: 'in_progress',
      completedStages: [],
      stageData,
      blockedReasons: null,
      updatedAt: new Date(),
    })
    .where(eq(logisticsOnboardingWorkflows.logisticsId, logisticsId));
}

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Seed: all partner types + onboarding CRUD verification');
  console.log('══════════════════════════════════════════════════════════════\n');

  const credentials: Array<{
    partnerType: string;
    email: string;
    partnerId: string;
    opsOnboarding: string;
    partnerPortal: string;
  }> = [];

  const allCrudErrors: string[] = [];

  for (const spec of PARTNER_SPECS) {
    console.log(`\n── ${spec.partnerType} (${spec.email}) ──`);
    const { partner, created } = await upsertPartnerAccount(spec);
    console.log(created ? '  ✅ Partner + account created' : '  ✅ Partner + account updated (existing)');

    if (needsGeneric(spec.partnerType)) {
      await ensureGenericOnboarding(partner.partnerId, spec.partnerType);
      const stageCount = getPartnerOnboardingStageOrder(spec.partnerType).length;
      console.log(`  ✅ Service onboarding (${stageCount} stages for ${spec.partnerType}, registration in_progress)`);
      const [acct] = await db
        .select({ accountId: partnerUserAccounts.accountId })
        .from(partnerUserAccounts)
        .where(eq(partnerUserAccounts.email, spec.email))
        .limit(1);
      if (acct) {
        await ensureActiveTenantLink(partner.partnerId, acct.accountId);
        console.log(`  ✅ Active tenant link (${DEMO_TENANT_CODE} + ${DEMO_SERVICE_CODE}) for portal Tenants`);
      }
    }

    let supplierId: string | undefined;
    let logisticsId: string | undefined;

    if (needsSupplier(spec.partnerType)) {
      const sup = await ensureSupplierRecord(partner.partnerId);
      supplierId = sup.supplierId;
      await ensureSupplierOnboardingPersisted(supplierId);
      console.log(`  ✅ Supplier record + workflow (${sup.supplierCode})`);
    }

    if (needsLogistics(spec.partnerType)) {
      const log = await ensureLogisticsRecord(partner.partnerId);
      logisticsId = log.logisticsId;
      await ensureLogisticsOnboardingPersisted(logisticsId);
      console.log(`  ✅ Logistics record + workflow (${log.logisticsCode})`);
    }

    // CRUD verification (full stage cycle, then reset for UI)
    if (needsGeneric(spec.partnerType)) {
      const errs = await exerciseGenericOnboardingCrud(
        partner.partnerId,
        spec.partnerType,
        spec.partnerType
      );
      allCrudErrors.push(...errs);
      await resetGenericOnboardingForUi(partner.partnerId, spec.partnerType);
      console.log('  ✅ Generic onboarding CRUD OK → reset to stage 1 for UI');
    }

    if (supplierId) {
      const errs = await exerciseSupplierOnboardingCrud(supplierId, spec.partnerType);
      allCrudErrors.push(...errs);
      await resetSupplierOnboardingForUi(supplierId);
      if (spec.email === 'onboard.supplier@example.com') {
        await seedPartialSupplierDemo(supplierId, 'catalog_in_progress');
        console.log('  ✅ Supplier demo: registration done, catalog_setup with 5 products');
      } else if (spec.email === 'onboard.supplier-logistics@example.com') {
        await seedPartialSupplierDemo(supplierId, 'documentation');
        console.log('  ✅ Supplier track demo: at documentation stage (supplier_logistics)');
      } else {
        console.log('  ✅ Supplier onboarding CRUD OK → reset to stage 1 for UI');
      }
    }

    if (logisticsId) {
      const errs = await exerciseLogisticsOnboardingCrud(logisticsId, spec.partnerType);
      allCrudErrors.push(...errs);
      await resetLogisticsOnboardingForUi(logisticsId);
      console.log('  ✅ Logistics onboarding CRUD OK → reset to stage 1 for UI');
    }

    const opsParts: string[] = [];
    if (needsGeneric(spec.partnerType)) {
      const n = getPartnerOnboardingStageOrder(spec.partnerType).length;
      opsParts.push(`OnboardingWorkflow (${n}-stage ${spec.partnerType})`);
    }
    if (supplierId) opsParts.push('SupplierOnboardingWorkflow');
    if (logisticsId) opsParts.push('LogisticsOnboardingWorkflow');

    credentials.push({
      partnerType: spec.partnerType,
      email: spec.email,
      partnerId: partner.partnerId,
      opsOnboarding: opsParts.join(' + ') || '—',
      partnerPortal: needsGeneric(spec.partnerType)
        ? '/partner/onboarding (generic)'
        : 'Generic page only; use Ops partner detail → Onboarding tab',
    });
  }

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  CRUD summary');
  console.log('══════════════════════════════════════════════════════════════');
  if (allCrudErrors.length === 0) {
    console.log('  ✅ All onboarding GET/UPDATE/read-back checks passed.\n');
  } else {
    console.log(`  ❌ ${allCrudErrors.length} issue(s):`);
    allCrudErrors.forEach((e) => console.log(`     - ${e}`));
    console.log('');
  }

  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Login credentials (Partner portal: /partner/login)');
  console.log(`  Password (all accounts): ${SHARED_PASSWORD}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  console.log('| Partner type | Email | Partner ID | Ops → Partner → Onboarding |');
  console.log('|--------------|-------|------------|----------------------------|');
  for (const c of credentials) {
    console.log(`| ${c.partnerType} | ${c.email} | \`${c.partnerId.slice(0, 8)}…\` | ${c.opsOnboarding} |`);
  }

  console.log('\n  Operations admin (approve / edit stages): use your seeded admin (e.g. admin@operations.local)');
  console.log('  Partner URLs after login:');
  console.log('    • Service types: /partner/onboarding');
  console.log('    • All types: open partner in Ops → /partners/:partnerId → Onboarding tab\n');

  // Spot-check activation blockers (should mention incomplete onboarding while at stage 1)
  const agency = credentials.find((c) => c.partnerType === 'agency');
  if (agency) {
    const blockers = await getPartnerActivationBlockers(agency.partnerId);
    console.log('  Sample activation-readiness (agency, stage 1):');
    console.log(blockers.length ? `    Blockers: ${blockers.join(' | ')}` : '    Ready to approve (unexpected at stage 1)');
  }

  await dbPool.end();
  process.exit(allCrudErrors.length > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error('❌ seed-all-partner-types-onboarding failed:', e);
  await dbPool.end().catch(() => {});
  process.exit(1);
});
