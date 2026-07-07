import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db';
import { partners } from '../db/schema/partners';
import { eq } from 'drizzle-orm';
import { partnerTypeFlags } from '../services/partnerApprovalPreconditions';

export async function requireServicePartner(request: FastifyRequest, reply: FastifyReply) {
  const partnerId = request.partnerUser?.partnerId;
  if (!partnerId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const [partner] = await db
    .select({ partnerType: partners.partnerType })
    .from(partners)
    .where(eq(partners.partnerId, partnerId))
    .limit(1);

  if (!partner || !partnerTypeFlags(partner.partnerType).needsGenericOnboarding) {
    return reply.code(403).send({
      error: 'Service partner onboarding is only available for agency, reseller, integrator, consultant, and affiliate partners',
    });
  }
}
