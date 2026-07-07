import { db } from '../db';
import { partnerDocuments } from '../db/schema/documents';
import { eq } from 'drizzle-orm';

/** Required document types that do not yet have at least one approved file for this partner. */
export async function getMissingApprovedRequiredDocumentTypes(
  partnerId: string,
  requiredTypes: readonly string[]
): Promise<string[]> {
  const docs = await db
    .select({
      documentType: partnerDocuments.documentType,
      status: partnerDocuments.status,
    })
    .from(partnerDocuments)
    .where(eq(partnerDocuments.partnerId, partnerId));

  const missing: string[] = [];
  for (const required of requiredTypes) {
    const hasApproved = docs.some(
      (d) => d.documentType === required && d.status === 'approved'
    );
    if (!hasApproved) missing.push(required);
  }
  return missing;
}

export function formatMissingDocumentTypes(types: string[]): string {
  return types.map((t) => t.replace(/_/g, ' ')).join(', ');
}
