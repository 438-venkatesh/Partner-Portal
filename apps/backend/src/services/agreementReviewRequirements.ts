import { db } from '../db';
import { partnerAgreements } from '../db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';

export type AgreementRow = {
  agreementId: string;
  status: string;
  platformSignedAt?: Date | string | null;
  signedByPlatform?: string | null;
};

/** Partner has signed (status signed) but operations has not countersigned yet. */
export function isPartnerSignedOnly(agreement: AgreementRow): boolean {
  return agreement.status === 'signed' && !agreement.platformSignedAt;
}

/** Accepted by operations (countersigned). */
export function isCountersignedAgreement(agreement: AgreementRow): boolean {
  return agreement.status === 'signed' && Boolean(agreement.platformSignedAt);
}

export function isTerminalRejectedAgreement(agreement: AgreementRow): boolean {
  return agreement.status === 'cancelled' || agreement.status === 'terminated';
}

export async function partnerHasCountersignedAgreement(partnerId: string): Promise<boolean> {
  const [row] = await db
    .select({ agreementId: partnerAgreements.agreementId })
    .from(partnerAgreements)
    .where(
      and(
        eq(partnerAgreements.partnerId, partnerId),
        eq(partnerAgreements.status, 'signed'),
        isNotNull(partnerAgreements.platformSignedAt)
      )
    )
    .limit(1);
  return Boolean(row);
}

export async function partnerHasPartnerSignedAgreement(partnerId: string): Promise<boolean> {
  const [row] = await db
    .select({ agreementId: partnerAgreements.agreementId })
    .from(partnerAgreements)
    .where(and(eq(partnerAgreements.partnerId, partnerId), eq(partnerAgreements.status, 'signed')))
    .limit(1);
  return Boolean(row);
}
