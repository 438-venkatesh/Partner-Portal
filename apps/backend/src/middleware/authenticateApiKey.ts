import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { partnerApiKeys } from '../db/schema';

declare module 'fastify' {
  interface FastifyRequest {
    apiPartnerId?: string;
    apiKeyId?: string;
  }
}

/** Machine auth — Authorization: Bearer pp_live_... */
export async function authenticateApiKey(request: FastifyRequest, reply: FastifyReply) {
  const token = request.headers.authorization?.replace('Bearer ', '').trim();
  if (!token?.startsWith('pp_live_')) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid API key' });
  }

  const rows = await db
    .select()
    .from(partnerApiKeys)
    .where(eq(partnerApiKeys.isActive, true));

  for (const row of rows) {
    if (!row.keyHash) continue;
    const ok = await bcrypt.compare(token, row.keyHash);
    if (ok) {
      request.apiPartnerId = row.partnerId;
      request.apiKeyId = row.keyId;
      db.update(partnerApiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(partnerApiKeys.keyId, row.keyId))
        .catch(() => {
          /* non-fatal — never block a request on a bookkeeping write */
        });
      return;
    }
  }

  return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid API key' });
}
