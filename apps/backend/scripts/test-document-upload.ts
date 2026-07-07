/**
 * End-to-end check: Operations login → list partners → multipart document upload.
 *
 * Usage (from repo root or apps/backend):
 *   1) Start API: `pnpm --filter @partner-portal/backend dev`
 *   2) In another shell: `pnpm --filter @partner-portal/backend exec tsx scripts/test-document-upload.ts`
 *
 * Env (optional): UPLOAD_TEST_URL (default http://localhost:3000), ADMIN_EMAIL, ADMIN_PASSWORD
 */
import 'dotenv/config';

const BASE = process.env.UPLOAD_TEST_URL || 'http://localhost:3000';

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@operations.local';
  const password = process.env.ADMIN_PASSWORD || 'OperationsAdmin123!';

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginText = await loginRes.text();
  if (!loginRes.ok) {
    console.error('Login failed', loginRes.status, loginText);
    process.exit(1);
  }
  const { token } = JSON.parse(loginText) as { token: string };

  const listRes = await fetch(`${BASE}/api/partners?page=1&limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listText = await listRes.text();
  if (!listRes.ok) {
    console.error('List partners failed', listRes.status, listText);
    process.exit(1);
  }
  const listJson = JSON.parse(listText) as { partners: { partnerId: string; partnerName: string }[] };
  const first = listJson.partners?.[0];
  if (!first?.partnerId) {
    console.error('No partners returned. Seed the DB: pnpm --filter @partner-portal/backend db:seed');
    process.exit(1);
  }

  const fd = new FormData();
  fd.append('partnerId', first.partnerId);
  fd.append('documentType', 'other');
  fd.append('documentName', `script-upload-${Date.now()}.txt`);
  fd.append('file', new Blob(['partner-portal upload test\n'], { type: 'text/plain' }), 'test.txt');

  const upRes = await fetch(`${BASE}/api/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const upText = await upRes.text();
  console.log('Upload status:', upRes.status);
  console.log(upText);
  if (!upRes.ok) {
    if (upText.includes("reading 'partnerId'")) {
      console.error(
        '\nHint: An outdated API process may still be bound to your port (e.g. 3000) running old code. Stop all node processes for this app and restart: pnpm --filter @partner-portal/backend dev'
      );
    }
    process.exit(1);
  }
  console.log('OK: document upload succeeded for partner', first.partnerName, first.partnerId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
