import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db';
import { partners } from '../db/schema/partners';
import { eq } from 'drizzle-orm';
import { isSupplierPartnerType } from '../services/supplierOnboardingBootstrap';

export async function requireSupplierPartner(request: FastifyRequest, reply: FastifyReply) {
  const partnerId = request.partnerUser?.partnerId;
  if (!partnerId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const [partner] = await db
    .select({ partnerType: partners.partnerType })
    .from(partners)
    .where(eq(partners.partnerId, partnerId))
    .limit(1);

  if (!partner || !isSupplierPartnerType(partner.partnerType)) {
    return reply.code(403).send({ error: 'Supplier onboarding is only available for supplier partners' });
  }
}
