import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { validateEnv } from './config/env';
import { authRoutes } from './routes/auth';
import { partnerRoutes } from './routes/partners';
import { supplierRoutes } from './routes/suppliers';
import { logisticsRoutes } from './routes/logistics';
import { documentRoutes } from './routes/documents';
import { onboardingRoutes } from './routes/onboarding';
import { performanceRoutes } from './routes/performance';
import { serviceRoutes } from './routes/services';
import { productRoutes } from './routes/products';
import { invoiceRoutes } from './routes/invoices';
import { partnerAuthRoutes, handleResendVerification } from './routes/partnerAuth';
import { partnerDashboardRoutes } from './routes/partnerDashboard';
import { partnerEmployeesRoutes } from './routes/partnerEmployees';
import { partnerNotificationsRoutes } from './routes/partnerNotifications';
import { tenantRoutes } from './routes/tenants';
import { partnerAgreementsPortalRoutes } from './routes/partnerAgreementsPortal';
import { partnerDocumentsPortalRoutes } from './routes/partnerDocumentsPortal';
import { partnerSupplierOnboardingRoutes } from './routes/partnerSupplierOnboarding';
import { partnerOnboardingRoutes } from './routes/partnerOnboarding';
import { partnerSupplierCatalogRoutes } from './routes/partnerSupplierCatalog';
import { billingAdminRoutes } from './routes/billingAdmin';
import { partnerBillingPortalRoutes } from './routes/partnerBillingPortal';
import { partnerApiKeysPortalRoutes } from './routes/partnerApiKeysPortal';
import { partnerWebhooksPortalRoutes } from './routes/partnerWebhooksPortal';
import { integrationStubRoutes } from './routes/integrationStubs';
import { partnerDirectoryRoutes } from './routes/partnerDirectory';
import { partnerTierRoutes } from './routes/partnerTiers';
import { partnerSegmentRoutes } from './routes/partnerSegments';
import { dealRoutes } from './routes/deals';
import { partnerDealsPortalRoutes } from './routes/partnerDealsPortal';
import { leadRoutes } from './routes/leads';
import { partnerLeadsPortalRoutes } from './routes/partnerLeadsPortal';
import { commissionRoutes } from './routes/commissions';
import { partnerCommissionsPortalRoutes } from './routes/partnerCommissionsPortal';
import { mdfRoutes } from './routes/mdf';
import { partnerMdfPortalRoutes } from './routes/partnerMdfPortal';
import { accountMappingRoutes } from './routes/accountMapping';
import { trainingRoutes } from './routes/training';
import { partnerTrainingPortalRoutes } from './routes/partnerTrainingPortal';
import { enablementContentRoutes } from './routes/enablementContent';
import { partnerEnablementPortalRoutes } from './routes/partnerEnablementPortal';
import { comarketingRoutes } from './routes/comarketing';
import { partnerComarketingPortalRoutes } from './routes/partnerComarketingPortal';
import { publicComarketingRoutes } from './routes/publicComarketing';
import { dataPrivacyRoutes } from './routes/dataPrivacy';
import { partnerPrivacyPortalRoutes } from './routes/partnerPrivacyPortal';
import { adminAnalyticsRoutes } from './routes/adminAnalytics';
import { reportRoutes } from './routes/reports';
import { biExportRoutes } from './routes/biExport';
import { realtimeRoutes } from './routes/realtime';
import { adminGovernanceRoutes } from './routes/adminGovernance';
import { mockDataService } from './services/mockDataService';
import { dbPool } from './db';

validateEnv();

const isProd = process.env.NODE_ENV === 'production';

const server = Fastify({
  logger: isProd
    ? true
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
  genReqId: () => randomUUID(),
});

async function start() {
  try {
    await server.register(cors, {
      origin: isProd ? process.env.FRONTEND_URL : true,
      credentials: true,
    });
    await server.register(multipart);
    await server.register(websocket);

    await server.register(rateLimit, { global: false });

    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.register(partnerDirectoryRoutes, { prefix: '/api/directory' });
    await server.register(partnerRoutes, { prefix: '/api/partners' });
    await server.register(partnerTierRoutes, { prefix: '/api/partner-tiers' });
    await server.register(partnerSegmentRoutes, { prefix: '/api/partner-segments' });
    await server.register(accountMappingRoutes, { prefix: '/api/account-mapping' });
    await server.register(dealRoutes, { prefix: '/api/deals' });
    await server.register(partnerDealsPortalRoutes, { prefix: '/api/partner-deals' });
    await server.register(leadRoutes, { prefix: '/api/leads' });
    await server.register(partnerLeadsPortalRoutes, { prefix: '/api/partner-leads' });
    await server.register(commissionRoutes, { prefix: '/api/commissions' });
    await server.register(partnerCommissionsPortalRoutes, { prefix: '/api/partner-commissions' });
    await server.register(mdfRoutes, { prefix: '/api/mdf' });
    await server.register(partnerMdfPortalRoutes, { prefix: '/api/partner-mdf' });
    await server.register(tenantRoutes, { prefix: '/api/tenants' });
    await server.register(billingAdminRoutes, { prefix: '/api/billing' });
    await server.register(partnerBillingPortalRoutes, { prefix: '/api/partner-billing' });
    await server.register(partnerApiKeysPortalRoutes, { prefix: '/api/partner-api-keys' });
    await server.register(partnerWebhooksPortalRoutes, { prefix: '/api/partner-webhooks' });
    await server.register(integrationStubRoutes, { prefix: '/api/integrations' });
    await server.register(supplierRoutes, { prefix: '/api/suppliers' });
    await server.register(logisticsRoutes, { prefix: '/api/logistics' });
    await server.register(documentRoutes, { prefix: '/api/documents' });
    await server.register(onboardingRoutes, { prefix: '/api/onboarding' });
    await server.register(performanceRoutes, { prefix: '/api/performance' });
    await server.register(serviceRoutes, { prefix: '/api/services' });
    await server.register(productRoutes, { prefix: '/api/products' });
    await server.register(invoiceRoutes, { prefix: '/api/invoices' });
    await server.register(trainingRoutes, { prefix: '/api/training' });
    await server.register(partnerTrainingPortalRoutes, { prefix: '/api/partner-training' });
    await server.register(enablementContentRoutes, { prefix: '/api/enablement' });
    await server.register(partnerEnablementPortalRoutes, { prefix: '/api/partner-enablement' });
    await server.register(comarketingRoutes, { prefix: '/api/comarketing' });
    await server.register(partnerComarketingPortalRoutes, { prefix: '/api/partner-comarketing' });
    await server.register(publicComarketingRoutes, { prefix: '/api/co-marketing' });
    await server.register(dataPrivacyRoutes, { prefix: '/api/privacy' });
    await server.register(partnerPrivacyPortalRoutes, { prefix: '/api/partner-privacy' });
    await server.register(adminAnalyticsRoutes, { prefix: '/api/admin-analytics' });
    await server.register(reportRoutes, { prefix: '/api/reports' });
    await server.register(biExportRoutes, { prefix: '/api/bi' });
    await server.register(realtimeRoutes, { prefix: '/api/realtime' });
    await server.register(adminGovernanceRoutes, { prefix: '/api/admin-governance' });

    await server.register(partnerAuthRoutes, { prefix: '/api/partner-auth' });
    server.post('/api/partner-auth/resend-verification', handleResendVerification);
    server.post('/api/partner-auth/resendVerification', handleResendVerification);
    if (!isProd) {
      console.log('[partner-auth] POST /api/partner-auth/resend-verification (root-registered)');
    }
    await server.register(partnerDashboardRoutes, { prefix: '/api/partner-dashboard' });
    await server.register(partnerEmployeesRoutes, { prefix: '/api/partner-employees' });
    await server.register(partnerNotificationsRoutes, { prefix: '/api/partner-notifications' });
    await server.register(partnerAgreementsPortalRoutes, { prefix: '/api/partner-agreements' });
    await server.register(partnerDocumentsPortalRoutes, { prefix: '/api/partner-documents' });
    await server.register(partnerSupplierOnboardingRoutes, { prefix: '/api/partner-supplier-onboarding' });
    await server.register(partnerOnboardingRoutes, { prefix: '/api/partner-onboarding' });
    await server.register(partnerSupplierCatalogRoutes, { prefix: '/api/partner-supplier-catalog' });
    // Partner document DELETE is registered on the plugin (/:documentId).

    server.get('/health', async () => {
      let database: 'ok' | 'down' = 'down';
      try {
        const r = await dbPool.query('SELECT 1');
        if (r.rowCount !== null && r.rowCount >= 0) database = 'ok';
      } catch {
        database = 'down';
      }
      return {
        status: database === 'ok' ? 'ok' : 'degraded',
        database,
        timestamp: new Date().toISOString(),
      };
    });

    if (!isProd) {
      server.post('/api/mock-data/init', async (request, reply) => {
        try {
          const result = await mockDataService.initializeMockData();
          return reply.send(result);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return reply.code(500).send({
            error: 'Failed to initialize mock data',
            message,
          });
        }
      });
    }

    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`🚀 Server running on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
