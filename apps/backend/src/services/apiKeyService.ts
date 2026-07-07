import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { partnerApiKeys } from '../db/schema';

export const apiKeyService = {
  async createKey(partnerId: string, scopes: string[] = []) {
    const raw = `pp_live_${crypto.randomBytes(24).toString('hex')}`;
    const prefix = raw.slice(0, 12);
    const keyHash = await bcrypt.hash(raw, 10);
    const [row] = await db
      .insert(partnerApiKeys)
      .values({
        partnerId,
        keyHash,
        keyPrefix: prefix,
        scopes,
      })
      .returning();
    return { row, rawKey: raw };
  },

  async listKeys(partnerId: string) {
    return db
      .select({
        keyId: partnerApiKeys.keyId,
        keyPrefix: partnerApiKeys.keyPrefix,
        scopes: partnerApiKeys.scopes,
        lastUsedAt: partnerApiKeys.lastUsedAt,
        expiresAt: partnerApiKeys.expiresAt,
        isActive: partnerApiKeys.isActive,
        createdAt: partnerApiKeys.createdAt,
      })
      .from(partnerApiKeys)
      .where(eq(partnerApiKeys.partnerId, partnerId));
  },

  async revokeKey(partnerId: string, keyId: string) {
    const [row] = await db
      .update(partnerApiKeys)
      .set({ isActive: false })
      .where(and(eq(partnerApiKeys.keyId, keyId), eq(partnerApiKeys.partnerId, partnerId)))
      .returning();
    return row ?? null;
  },
};
