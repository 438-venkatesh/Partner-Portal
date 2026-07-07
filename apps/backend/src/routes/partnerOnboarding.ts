import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticatePartner } from '../middleware/partnerAuth';
import { requireServicePartner } from '../middleware/requireServicePartner';
import { onboardingService } from '../services/onboardingService';
import { PartnerStageValidationError } from '../services/partnerOnboardingValidation';
import { zodToFastifySchema } from '../utils/schemaConverter';
import {
  partnerSaveStageDraftSchema,
  partnerSubmitStageSchema,
} from '@partner-portal/common';

export async function partnerOnboardingRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);
  fastify.addHook('onRequest', requireServicePartner);

  fastify.get('/workflow', async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const workflow = await onboardingService.getWorkflow(partnerId);
    return reply.send({ workflow });
  });

  fastify.post('/ensure-agreement', async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    try {
      const agreement = await onboardingService.ensureServicePartnerAgreementIfNeeded(partnerId);
      if (!agreement) {
        return reply.code(400).send({
          message:
            'Agreement is not ready yet. Complete platform verification first, or contact operations.',
        });
      }
      return reply.send({ agreement });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to issue agreement';
      return reply.code(400).send({ message });
    }
  });

  fastify.put('/stage/draft', {
    schema: { body: zodToFastifySchema(partnerSaveStageDraftSchema) },
  }, async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const body = request.body as z.infer<typeof partnerSaveStageDraftSchema>;
    try {
      const workflow = await onboardingService.saveStageDraft(
        partnerId,
        body.stage,
        body.payload || {}
      );
      return reply.send(workflow);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      return reply.code(400).send({ message });
    }
  });

  fastify.post('/stage/submit', {
    schema: { body: zodToFastifySchema(partnerSubmitStageSchema) },
  }, async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const accountId = request.partnerUser!.accountId;
    const body = request.body as z.infer<typeof partnerSubmitStageSchema>;

    try {
      const workflow = await onboardingService.submitStage(partnerId, body.stage, { accountId }, body);
      return reply.send({ workflow });
    } catch (error) {
      if (error instanceof PartnerStageValidationError) {
        return reply.code(400).send({ message: error.message, details: error.details });
      }
      const message = error instanceof Error ? error.message : 'Submit failed';
      return reply.code(400).send({ message });
    }
  });
}
