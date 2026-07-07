import { FastifyInstance } from 'fastify';
import { authenticatePartner } from '../middleware/partnerAuth';
import { authenticate } from '../middleware/auth';

/**
 * Placeholders for external integrations (Stripe/Razorpay, DocuSign, logistics carriers).
 * Replace with real provider SDK calls and secrets from environment variables.
 */
export async function integrationStubRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/payments/invoices/:invoiceId/checkout-session',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { invoiceId } = request.params as { invoiceId: string };
      return reply.send({
        provider: process.env.PAYMENT_PROVIDER || 'stripe',
        checkoutUrl: `https://checkout.example.com/pay/${invoiceId}`,
        message: 'Wire Stripe/Razorpay SDK here',
      });
    }
  );

  fastify.get(
    '/logistics/shipments/:shipmentId/tracking',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { shipmentId } = request.params as { shipmentId: string };
      return reply.send({
        shipmentId,
        status: 'in_transit',
        events: [],
        message: 'Wire logisticsPartners.trackingApiUrl fetch here',
      });
    }
  );

  fastify.post(
    '/partner-agreements/:agreementId/esign/start',
    { preHandler: [authenticatePartner] },
    async (request, reply) => {
      const { agreementId } = request.params as { agreementId: string };
      return reply.send({
        agreementId,
        signingUrl: `https://esign.example.com/sign/${agreementId}`,
        message: 'Wire DocuSign / HelloSign using eSignatureDocumentId',
      });
    }
  );
}
