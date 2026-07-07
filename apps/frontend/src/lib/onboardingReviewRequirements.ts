import type { Document } from '@/lib/api/documents';
import type { PartnerAgreement } from '@/lib/api/partners';

export function countMissingApprovedRequiredDocTypes(
  required: readonly { type: string }[],
  documents: Document[]
): number {
  return required.filter(
    (req) => !documents.some((d) => d.documentType === req.type && d.status === 'approved')
  ).length;
}

export type DocumentTypeReviewStatus =
  | 'missing'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'all_rejected';

export function getDocumentTypeReviewStatus(
  type: string,
  documents: Document[]
): DocumentTypeReviewStatus {
  const matches = documents.filter((d) => d.documentType === type);
  if (matches.length === 0) return 'missing';
  if (matches.some((d) => d.status === 'approved')) return 'approved';
  if (matches.every((d) => d.status === 'rejected')) return 'all_rejected';
  return 'pending';
}

export function countRequiredTypesAllRejected(
  required: readonly { type: string }[],
  documents: Document[]
): number {
  return required.filter((r) => getDocumentTypeReviewStatus(r.type, documents) === 'all_rejected').length;
}

export type AgreementReviewStatus =
  | 'draft'
  | 'awaiting_partner'
  | 'awaiting_ops'
  | 'accepted'
  | 'rejected'
  | 'expired';

export function getAgreementReviewStatus(
  agreement: Pick<PartnerAgreement, 'status'> & {
    platformSignedAt?: string | null;
  }
): AgreementReviewStatus {
  if (agreement.status === 'cancelled' || agreement.status === 'terminated') {
    return 'rejected';
  }
  if (agreement.status === 'expired') return 'expired';
  if (agreement.status === 'signed' && agreement.platformSignedAt) return 'accepted';
  if (agreement.status === 'signed') return 'awaiting_ops';
  if (agreement.status === 'pending_signature') return 'awaiting_partner';
  return 'draft';
}

export function isCountersignedAgreement(
  agreement: Pick<PartnerAgreement, 'status'> & { platformSignedAt?: string | null }
): boolean {
  return getAgreementReviewStatus(agreement) === 'accepted';
}

export function hasCountersignedAgreement(
  agreements: Array<Pick<PartnerAgreement, 'status'> & { platformSignedAt?: string | null }>
): boolean {
  return agreements.some(isCountersignedAgreement);
}

/** @deprecated use hasCountersignedAgreement for stage completion */
export function hasSignedAgreement(agreements: PartnerAgreement[]): boolean {
  return agreements.some((a) => a.status === 'signed');
}

export const AGREEMENT_STATUS_LABELS: Record<AgreementReviewStatus, string> = {
  draft: 'Draft',
  awaiting_partner: 'Awaiting your signature',
  awaiting_ops: 'Signed — awaiting operations',
  accepted: 'Accepted by operations',
  rejected: 'Rejected by operations',
  expired: 'Expired',
};

export const DOCUMENT_TYPE_STATUS_LABELS: Record<DocumentTypeReviewStatus, string> = {
  missing: 'Missing',
  pending: 'Awaiting review',
  approved: 'Approved',
  rejected: 'Rejected — re-upload',
  all_rejected: 'Rejected — re-upload required',
};
