import { FastifyInstance } from 'fastify';
import { authenticatePartner } from '../middleware/partnerAuth';
import { agreementService } from '../services/agreementService';
import { supplierOnboardingService } from '../services/supplierOnboardingService';
import { onboardingService } from '../services/onboardingService';

/** Partner-facing agreement list/detail (token scoped to partner). */
export async function partnerAgreementsPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/', async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });
    try {
      await supplierOnboardingService.ensureSupplierAgreementForPartnerIfNeeded(partnerId);
    } catch {
      /* non-supplier partners: skip auto-issue */
    }
    try {
      await onboardingService.ensureServicePartnerAgreementIfNeeded(partnerId);
    } catch {
      /* non-service partners: skip auto-issue */
    }
    const agreements = await agreementService.listForPartner(partnerId);
    return reply.send({ agreements });
  });

  fastify.get('/:agreementId', async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    const { agreementId } = request.params as { agreementId: string };
    if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });
    const row = await agreementService.getById(agreementId, partnerId);
    if (!row) return reply.code(404).send({ error: 'Not found' });
    return reply.send({ agreement: row });
  });

  fastify.post('/:agreementId/sign', async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    const accountId = request.partnerUser?.accountId;
    const { agreementId } = request.params as { agreementId: string };
    if (!partnerId || !accountId) return reply.code(401).send({ error: 'Unauthorized' });
    const updated = await agreementService.updateStatus(agreementId, partnerId, 'signed');
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.send({ agreement: updated });
  });
}
