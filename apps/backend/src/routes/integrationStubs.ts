import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';

/**
 * Placeholders for external integrations (Stripe/Razorpay, logistics carriers) that need a real
 * payment/carrier account to wire up for real. Partner agreement e-signing is NOT a stub here —
 * see agreementService.signByPartner for the native typed-signature capture that replaced it.
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
}
