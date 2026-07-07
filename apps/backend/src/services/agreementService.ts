import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db';
import { partnerAgreements } from '../db/schema';

export type AgreementStatus =
  | 'draft'
  | 'pending_signature'
  | 'signed'
  | 'expired'
  | 'terminated'
  | 'cancelled';

const ALLOWED_STATUS_TRANSITIONS: Record<AgreementStatus, AgreementStatus[]> = {
  draft: ['pending_signature', 'cancelled'],
  pending_signature: ['signed', 'cancelled', 'expired'],
  signed: ['terminated', 'cancelled', 'expired'],
  expired: [],
  terminated: [],
  cancelled: [],
};

export class AgreementTransitionError extends Error {
  constructor(
    public readonly from: AgreementStatus,
    public readonly to: AgreementStatus
  ) {
    super(`Invalid agreement status transition: ${from} -> ${to}`);
    this.name = 'AgreementTransitionError';
  }
}

function assertAllowedStatusTransition(from: AgreementStatus, to: AgreementStatus) {
  if (from === to) return;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AgreementTransitionError(from, to);
  }
}

export const agreementService = {
  async listForPartner(partnerId: string) {
    return db
      .select()
      .from(partnerAgreements)
      .where(eq(partnerAgreements.partnerId, partnerId))
      .orderBy(desc(partnerAgreements.createdAt));
  },

  async getById(agreementId: string, partnerId?: string) {
    const cond =
      partnerId !== undefined
        ? and(eq(partnerAgreements.agreementId, agreementId), eq(partnerAgreements.partnerId, partnerId))
        : eq(partnerAgreements.agreementId, agreementId);
    const [row] = await db.select().from(partnerAgreements).where(cond!).limit(1);
    return row ?? null;
  },

  async create(data: typeof partnerAgreements.$inferInsert) {
    const [row] = await db.insert(partnerAgreements).values(data).returning();
    return row;
  },

  async updateAgreement(
    agreementId: string,
    partnerId: string,
    patch: {
      agreementType?: string;
      agreementNumber?: string;
      title?: string;
      description?: string | null;
      tenantId?: string | null;
      documentUrl?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      notes?: string | null;
      status?: AgreementStatus;
    }
  ) {
    if (patch.status) {
      const current = await this.getById(agreementId, partnerId);
      if (!current) return null;
      assertAllowedStatusTransition(current.status as AgreementStatus, patch.status);
    }
    const [row] = await db
      .update(partnerAgreements)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(partnerAgreements.agreementId, agreementId), eq(partnerAgreements.partnerId, partnerId)))
      .returning();
    return row ?? null;
  },

  async updateStatus(
    agreementId: string,
    partnerId: string,
    status: AgreementStatus
  ) {
    const current = await this.getById(agreementId, partnerId);
    if (!current) return null;
    assertAllowedStatusTransition(current.status as AgreementStatus, status);
    const [row] = await db
      .update(partnerAgreements)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(partnerAgreements.agreementId, agreementId), eq(partnerAgreements.partnerId, partnerId)))
      .returning();
    return row ?? null;
  },

  /** Real e-signature capture: typed full name + server-observed IP/user-agent, not just a status flip. */
  async signByPartner(
    agreementId: string,
    partnerId: string,
    data: { accountId: string; fullName: string; ipAddress?: string | null; userAgent?: string | null }
  ) {
    const current = await this.getById(agreementId, partnerId);
    if (!current) return null;
    assertAllowedStatusTransition(current.status as AgreementStatus, 'signed');

    const [row] = await db
      .update(partnerAgreements)
      .set({
        status: 'signed',
        signedByPartner: data.accountId,
        partnerSignedAt: new Date(),
        partnerSignatureName: data.fullName,
        partnerSignatureIp: data.ipAddress,
        partnerSignatureUserAgent: data.userAgent,
        updatedAt: new Date(),
      })
      .where(and(eq(partnerAgreements.agreementId, agreementId), eq(partnerAgreements.partnerId, partnerId)))
      .returning();
    return row ?? null;
  },

  async deleteAgreement(agreementId: string, partnerId: string) {
    const [row] = await db
      .delete(partnerAgreements)
      .where(and(eq(partnerAgreements.agreementId, agreementId), eq(partnerAgreements.partnerId, partnerId)))
      .returning();
    return row ?? null;
  },
};
