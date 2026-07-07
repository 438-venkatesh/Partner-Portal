import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';
import { partnerUserAccounts, partners } from './schema';

async function getLatestPartner() {
  try {
    // Get the most recently created partner account with partner details
    const result = await db.execute(sql`
      SELECT 
        pua.account_id,
        pua.email,
        pua.first_name,
        pua.last_name,
        pua.status as account_status,
        pua.email_verified,
        pua.created_at as account_created_at,
        p.partner_id,
        p.partner_name,
        p.partner_code,
        p.partner_type,
        p.status as partner_status,
        p.created_at as partner_created_at
      FROM partner_user_accounts pua
      JOIN partners p ON pua.partner_id = p.partner_id
      ORDER BY pua.created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('No partner accounts found in the database.');
      return;
    }

    const account = result.rows[0];
    
    console.log('\n📋 Latest Registered Partner Account:');
    console.log('=====================================');
    console.log(`Email: ${account.email}`);
    console.log(`Name: ${account.first_name || ''} ${account.last_name || ''}`.trim() || 'N/A');
    console.log(`Account Status: ${account.account_status}`);
    console.log(`Email Verified: ${account.email_verified ? 'Yes' : 'No'}`);
    console.log(`Account Created: ${account.account_created_at}`);
    console.log('\n📋 Partner Organization Details:');
    console.log('================================');
    console.log(`Partner Name: ${account.partner_name}`);
    console.log(`Partner Code: ${account.partner_code}`);
    console.log(`Partner Type: ${account.partner_type}`);
    console.log(`Partner Status: ${account.partner_status}`);
    console.log(`Partner Created: ${account.partner_created_at}`);
    console.log('\n⚠️  Note: Password is hashed and cannot be retrieved.');
    console.log('   If you need to reset the password, use the password reset flow.');
    console.log('\n✅ Login Credentials:');
    console.log(`   Email: ${account.email}`);
    console.log(`   Password: [The password you entered during registration]`);
    
  } catch (error) {
    console.error('❌ Error fetching partner account:', error);
    throw error;
  }
}

getLatestPartner()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });









