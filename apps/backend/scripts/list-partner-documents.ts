import 'dotenv/config';
import { db } from '../src/db';
import { partnerDocuments } from '../src/db/schema/documents';
import { partnerUserAccounts } from '../src/db/schema/partnerAuth';
import { eq } from 'drizzle-orm';

const email = process.argv[2] || 'onboard.supplier@example.com';

async function main() {
  const [acc] = await db
    .select()
    .from(partnerUserAccounts)
    .where(eq(partnerUserAccounts.email, email))
    .limit(1);
  if (!acc) {
    console.log('No account for', email);
    return;
  }
  const docs = await db
    .select()
    .from(partnerDocuments)
    .where(eq(partnerDocuments.partnerId, acc.partnerId));
  console.log('partnerId:', acc.partnerId);
  console.log('documents:', docs.length);
  for (const d of docs) {
    console.log({
      documentId: d.documentId,
      documentType: d.documentType,
      documentName: d.documentName,
      storageKey: d.storageKey,
      fileUrl: d.fileUrl?.slice(0, 100),
      status: d.status,
    });
  }
}

main().catch(console.error);
