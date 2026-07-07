/**
 * One-time bootstrap: create the first Operations superadmin when `admin_users` is empty.
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from the environment (see .env.example).
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { dbPool } from './index';
import { operationsAuthService } from '../services/operationsAuthService';

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@operations.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'OperationsAdmin123!';

  const count = await operationsAuthService.countAdmins();
  if (count > 0) {
    console.log('✅ admin_users already has rows — nothing to do.');
    await dbPool.end();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const client = await dbPool.connect();
  try {
    await client.query(
      `INSERT INTO admin_users (email, password_hash, role, is_active)
       VALUES ($1, $2, 'superadmin', true)`,
      [email, passwordHash]
    );
    console.log(`✅ Seeded superadmin: ${email}`);
    console.log('   You can log in via POST /api/auth/login');
  } finally {
    client.release();
    await dbPool.end();
  }
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await dbPool.end().catch(() => {});
  process.exit(1);
});
