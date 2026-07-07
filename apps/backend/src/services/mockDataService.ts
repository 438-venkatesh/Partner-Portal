/**
 * Mock Data Service
 * Provides sample data for development and testing when database is not available
 */

import { db } from '../db';
import { partners } from '../db/schema/partners';
import { suppliers } from '../db/schema/suppliers';
import { logisticsPartners } from '../db/schema/logistics';
import {
  partnerOnboardingWorkflows,
  supplierOnboardingWorkflows,
  logisticsOnboardingWorkflows,
} from '../db/schema/advanced';
import { eq } from 'drizzle-orm';

/** Must match `MOCK_PARTNERS` in `partnerService` so list + document FK stay aligned after seed. */
const SEED_PARTNER_IDS = [
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0001-000000000004',
  '00000000-0000-0000-0001-000000000005',
  '00000000-0000-0000-0001-000000000006',
] as const;

// Mock user for seeding
const mockUser = {
  userId: '00000000-0000-0000-0000-000000000000',
  email: 'admin@example.com',
  role: 'platform_admin',
};

export const mockDataService = {
  /**
   * Initialize mock data - creates sample partners, suppliers, and logistics partners
   * with onboarding workflows at different stages
   */
  async initializeMockData() {
    try {
      console.log('🌱 Initializing mock data...\n');

      // Check if data already exists
      const [existingPartner] = await db.select().from(partners).limit(1);
      if (existingPartner) {
        console.log('✅ Mock data already exists. Skipping initialization.\n');
        return { message: 'Mock data already exists', count: 0 };
      }

      // ========== CREATE PARTNERS ==========
      console.log('Creating partners...');

      // 1. Service Partner (Agency) - Early stage onboarding
      const [partner1] = await db.insert(partners).values({
        partnerId: SEED_PARTNER_IDS[0],
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
      }).returning();

      // 2. Service Partner (Reseller) - Mid-stage onboarding
      const [partner2] = await db.insert(partners).values({
        partnerId: SEED_PARTNER_IDS[1],
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
      }).returning();

      // 3. Supplier Partner - Early stage onboarding
      const [partner3] = await db.insert(partners).values({
        partnerId: SEED_PARTNER_IDS[2],
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
      }).returning();

      // 4. Logistics Partner - Early stage onboarding
      const [partner4] = await db.insert(partners).values({
        partnerId: SEED_PARTNER_IDS[3],
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
      }).returning();

      // 5. Service Partner (Integrator) - Advanced stage onboarding
      const [partner5] = await db.insert(partners).values({
        partnerId: SEED_PARTNER_IDS[4],
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
      }).returning();

      // 6. Supplier + Logistics Partner
      const [partner6] = await db.insert(partners).values({
        partnerId: SEED_PARTNER_IDS[5],
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
      }).returning();

      console.log(`✅ Created ${6} partners\n`);

      // ========== CREATE SUPPLIERS ==========
      console.log('Creating suppliers...');

      const [supplier1] = await db.insert(suppliers).values({
        partnerId: partner3.partnerId,
        supplierCode: 'SUP-001',
        supplierCategory: 'raw_materials',
        supplierTier: 'tier_1',
        paymentTerms: 'Net 30',
        creditLimit: '100000.00',
        currency: 'USD',
        leadTimeDays: 14,
        minimumOrderQuantity: '1000.00',
        supplyRegions: ['North America', 'Europe'],
        supplierPortalEnabled: true,
      }).returning();

      const [supplier2] = await db.insert(suppliers).values({
        partnerId: partner6.partnerId,
        supplierCode: 'SUP-002',
        supplierCategory: 'finished_goods',
        supplierTier: 'tier_2',
        paymentTerms: 'Net 45',
        creditLimit: '50000.00',
        currency: 'USD',
        leadTimeDays: 21,
        minimumOrderQuantity: '500.00',
        supplyRegions: ['North America'],
        supplierPortalEnabled: true,
      }).returning();

      console.log(`✅ Created ${2} suppliers\n`);

      // ========== CREATE LOGISTICS PARTNERS ==========
      console.log('Creating logistics partners...');

      const [logistics1] = await db.insert(logisticsPartners).values({
        partnerId: partner4.partnerId,
        logisticsCode: 'LOG-001',
        logisticsType: 'transportation',
        serviceCapabilities: ['ground_transport', 'express_delivery', 'freight'],
        fleetSize: 50,
        fleetTypes: ['trucks', 'vans', 'semi_trucks'],
        warehouseLocations: [
          { city: 'New York', state: 'NY', country: 'USA' },
          { city: 'Los Angeles', state: 'CA', country: 'USA' },
        ],
        coverageRegions: ['North America'],
        trackingCapabilities: true,
        apiIntegration: true,
        trackingApiUrl: 'https://api.expresslogistics.example.com/tracking',
        insuranceCoverage: '5000000.00',
        logisticsPortalEnabled: true,
      }).returning();

      const [logistics2] = await db.insert(logisticsPartners).values({
        partnerId: partner6.partnerId,
        logisticsCode: 'LOG-002',
        logisticsType: '3pl',
        serviceCapabilities: ['warehousing', 'fulfillment', 'last_mile'],
        fleetSize: 25,
        fleetTypes: ['vans', 'trucks'],
        warehouseLocations: [
          { city: 'Chicago', state: 'IL', country: 'USA' },
          { city: 'Dallas', state: 'TX', country: 'USA' },
        ],
        coverageRegions: ['North America', 'Central America'],
        trackingCapabilities: true,
        apiIntegration: false,
        insuranceCoverage: '3000000.00',
        logisticsPortalEnabled: true,
      }).returning();

      console.log(`✅ Created ${2} logistics partners\n`);

      // ========== CREATE ONBOARDING WORKFLOWS ==========
      console.log('Creating onboarding workflows...');

      // Partner 1 - Early stage (registration completed, service selection in progress)
      const partner1Stages: Record<string, any> = {
        registration: { status: 'completed', completedAt: new Date('2024-01-15').toISOString() },
        service_selection: { status: 'in_progress' },
        initial_review: { status: 'pending' },
        documentation: { status: 'pending' },
        verification: { status: 'pending' },
        agreement: { status: 'pending' },
        app_access: { status: 'pending' },
        user_setup: { status: 'pending' },
        training: { status: 'pending' },
        testing: { status: 'pending' },
        go_live: { status: 'pending' },
      };

      await db.insert(partnerOnboardingWorkflows).values({
        partnerId: partner1.partnerId,
        currentStage: 'service_selection',
        stageStatus: 'in_progress',
        completedStages: ['registration'],
        stageData: partner1Stages,
        startedAt: new Date('2024-01-15'),
      });

      // Partner 2 - Mid stage
      const partner2Stages: Record<string, any> = {
        registration: { status: 'completed', completedAt: new Date('2024-01-20').toISOString() },
        service_selection: { status: 'completed', completedAt: new Date('2024-01-21').toISOString() },
        initial_review: { status: 'completed', completedAt: new Date('2024-01-22').toISOString() },
        documentation: { status: 'in_progress' },
        verification: { status: 'pending' },
        agreement: { status: 'pending' },
        app_access: { status: 'pending' },
        user_setup: { status: 'pending' },
        training: { status: 'pending' },
        testing: { status: 'pending' },
        go_live: { status: 'pending' },
      };

      await db.insert(partnerOnboardingWorkflows).values({
        partnerId: partner2.partnerId,
        currentStage: 'documentation',
        stageStatus: 'in_progress',
        completedStages: ['registration', 'service_selection', 'initial_review'],
        stageData: partner2Stages,
        startedAt: new Date('2024-01-20'),
      });

      // Partner 3 - Supplier onboarding
      const supplier1Stages: Record<string, any> = {
        supplier_registration: { status: 'completed', completedAt: new Date('2024-01-25').toISOString() },
        catalog_setup: { status: 'in_progress' },
        supplier_documentation: { status: 'pending' },
        supplier_verification: { status: 'pending' },
        supplier_agreement: { status: 'pending' },
        payment_setup: { status: 'pending' },
        supplier_portal_access: { status: 'pending' },
        supplier_activation: { status: 'pending' },
      };

      await db.insert(supplierOnboardingWorkflows).values({
        supplierId: supplier1.supplierId,
        currentStage: 'catalog_setup',
        stageStatus: 'in_progress',
        completedStages: ['supplier_registration'],
        stageData: supplier1Stages,
        startedAt: new Date('2024-01-25'),
      });

      // Partner 3 - Also needs partner onboarding workflow
      const partner3Stages: Record<string, any> = {
        registration: { status: 'completed', completedAt: new Date('2024-01-25').toISOString() },
        service_selection: { status: 'completed', completedAt: new Date('2024-01-26').toISOString() },
        initial_review: { status: 'completed', completedAt: new Date('2024-01-27').toISOString() },
        documentation: { status: 'in_progress' },
        verification: { status: 'pending' },
        agreement: { status: 'pending' },
        app_access: { status: 'pending' },
        user_setup: { status: 'pending' },
        training: { status: 'pending' },
        testing: { status: 'pending' },
        go_live: { status: 'pending' },
      };

      await db.insert(partnerOnboardingWorkflows).values({
        partnerId: partner3.partnerId,
        currentStage: 'documentation',
        stageStatus: 'in_progress',
        completedStages: ['registration', 'service_selection', 'initial_review'],
        stageData: partner3Stages,
        startedAt: new Date('2024-01-25'),
      });

      // Partner 4 - Logistics onboarding
      const logistics1Stages: Record<string, any> = {
        logistics_registration: { status: 'completed', completedAt: new Date('2024-01-28').toISOString() },
        fleet_setup: { status: 'in_progress' },
        logistics_documentation: { status: 'pending' },
        logistics_verification: { status: 'pending' },
        logistics_agreement: { status: 'pending' },
        api_integration: { status: 'pending' },
        logistics_portal_access: { status: 'pending' },
        logistics_testing: { status: 'pending' },
        logistics_activation: { status: 'pending' },
      };

      await db.insert(logisticsOnboardingWorkflows).values({
        logisticsId: logistics1.logisticsId,
        currentStage: 'fleet_setup',
        stageStatus: 'in_progress',
        completedStages: ['logistics_registration'],
        stageData: logistics1Stages,
        startedAt: new Date('2024-01-28'),
      });

      // Partner 4 - Also needs partner onboarding workflow
      const partner4Stages: Record<string, any> = {
        registration: { status: 'completed', completedAt: new Date('2024-01-28').toISOString() },
        service_selection: { status: 'completed', completedAt: new Date('2024-01-29').toISOString() },
        initial_review: { status: 'completed', completedAt: new Date('2024-01-30').toISOString() },
        documentation: { status: 'in_progress' },
        verification: { status: 'pending' },
        agreement: { status: 'pending' },
        app_access: { status: 'pending' },
        user_setup: { status: 'pending' },
        training: { status: 'pending' },
        testing: { status: 'pending' },
        go_live: { status: 'pending' },
      };

      await db.insert(partnerOnboardingWorkflows).values({
        partnerId: partner4.partnerId,
        currentStage: 'documentation',
        stageStatus: 'in_progress',
        completedStages: ['registration', 'service_selection', 'initial_review'],
        stageData: partner4Stages,
        startedAt: new Date('2024-01-28'),
      });

      // Partner 5 - Advanced stage
      const partner5Stages: Record<string, any> = {
        registration: { status: 'completed', completedAt: new Date('2024-02-01').toISOString() },
        service_selection: { status: 'completed', completedAt: new Date('2024-02-02').toISOString() },
        initial_review: { status: 'completed', completedAt: new Date('2024-02-03').toISOString() },
        documentation: { status: 'completed', completedAt: new Date('2024-02-05').toISOString() },
        verification: { status: 'completed', completedAt: new Date('2024-02-07').toISOString() },
        agreement: { status: 'completed', completedAt: new Date('2024-02-08').toISOString() },
        app_access: { status: 'completed', completedAt: new Date('2024-02-10').toISOString() },
        user_setup: { status: 'completed', completedAt: new Date('2024-02-12').toISOString() },
        training: { status: 'completed', completedAt: new Date('2024-02-15').toISOString() },
        testing: { status: 'in_progress' },
        go_live: { status: 'pending' },
      };

      await db.insert(partnerOnboardingWorkflows).values({
        partnerId: partner5.partnerId,
        currentStage: 'testing',
        stageStatus: 'in_progress',
        completedStages: [
          'registration',
          'service_selection',
          'initial_review',
          'documentation',
          'verification',
          'agreement',
          'app_access',
          'user_setup',
          'training',
        ],
        stageData: partner5Stages,
        startedAt: new Date('2024-02-01'),
      });

      // Partner 6 - Supplier onboarding
      const supplier2Stages: Record<string, any> = {
        supplier_registration: { status: 'completed', completedAt: new Date('2024-02-05').toISOString() },
        catalog_setup: { status: 'completed', completedAt: new Date('2024-02-07').toISOString() },
        supplier_documentation: { status: 'in_progress' },
        supplier_verification: { status: 'pending' },
        supplier_agreement: { status: 'pending' },
        payment_setup: { status: 'pending' },
        supplier_portal_access: { status: 'pending' },
        supplier_activation: { status: 'pending' },
      };

      await db.insert(supplierOnboardingWorkflows).values({
        supplierId: supplier2.supplierId,
        currentStage: 'supplier_documentation',
        stageStatus: 'in_progress',
        completedStages: ['supplier_registration', 'catalog_setup'],
        stageData: supplier2Stages,
        startedAt: new Date('2024-02-05'),
      });

      // Partner 6 - Logistics onboarding
      const logistics2Stages: Record<string, any> = {
        logistics_registration: { status: 'completed', completedAt: new Date('2024-02-05').toISOString() },
        fleet_setup: { status: 'completed', completedAt: new Date('2024-02-06').toISOString() },
        logistics_documentation: { status: 'in_progress' },
        logistics_verification: { status: 'pending' },
        logistics_agreement: { status: 'pending' },
        api_integration: { status: 'pending' },
        logistics_portal_access: { status: 'pending' },
        logistics_testing: { status: 'pending' },
        logistics_activation: { status: 'pending' },
      };

      await db.insert(logisticsOnboardingWorkflows).values({
        logisticsId: logistics2.logisticsId,
        currentStage: 'logistics_documentation',
        stageStatus: 'in_progress',
        completedStages: ['logistics_registration', 'fleet_setup'],
        stageData: logistics2Stages,
        startedAt: new Date('2024-02-05'),
      });

      // Partner 6 - Also needs partner onboarding workflow
      const partner6Stages: Record<string, any> = {
        registration: { status: 'completed', completedAt: new Date('2024-02-05').toISOString() },
        service_selection: { status: 'completed', completedAt: new Date('2024-02-06').toISOString() },
        initial_review: { status: 'completed', completedAt: new Date('2024-02-07').toISOString() },
        documentation: { status: 'in_progress' },
        verification: { status: 'pending' },
        agreement: { status: 'pending' },
        app_access: { status: 'pending' },
        user_setup: { status: 'pending' },
        training: { status: 'pending' },
        testing: { status: 'pending' },
        go_live: { status: 'pending' },
      };

      await db.insert(partnerOnboardingWorkflows).values({
        partnerId: partner6.partnerId,
        currentStage: 'documentation',
        stageStatus: 'in_progress',
        completedStages: ['registration', 'service_selection', 'initial_review'],
        stageData: partner6Stages,
        startedAt: new Date('2024-02-05'),
      });

      console.log('✅ Created onboarding workflows\n');

      const summary = {
        partners: 6,
        suppliers: 2,
        logistics: 2,
        partnerWorkflows: 6,
        supplierWorkflows: 2,
        logisticsWorkflows: 2,
      };

      console.log('📊 Mock Data Summary:');
      console.log(`  - Partners: ${summary.partners}`);
      console.log(`  - Suppliers: ${summary.suppliers}`);
      console.log(`  - Logistics Partners: ${summary.logistics}`);
      console.log(`  - Partner Onboarding Workflows: ${summary.partnerWorkflows}`);
      console.log(`  - Supplier Onboarding Workflows: ${summary.supplierWorkflows}`);
      console.log(`  - Logistics Onboarding Workflows: ${summary.logisticsWorkflows}`);
      console.log('\n✅ Mock data initialization completed!\n');

      return { message: 'Mock data initialized successfully', ...summary };
    } catch (error) {
      console.error('❌ Failed to initialize mock data:', error);
      throw error;
    }
  },
};









