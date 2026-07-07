import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';
import { partnerUserAccounts } from './schema';
import { eq } from 'drizzle-orm';

async function activateTestPartner() {
  try {
    const testEmail = 'test.partner@example.com';
    
    console.log(`Activating test partner account: ${testEmail}...\n`);

    // Update account status to active and mark email as verified
    const result = await db
      .update(partnerUserAccounts)
      .set({
        status: 'active',
        emailVerified: true,
      })
      .where(eq(partnerUserAccounts.email, testEmail))
      .returning();

    if (result.length === 0) {
      console.log(`❌ No account found with email: ${testEmail}`);
      return;
    }

    const account = result[0];
    
    console.log('✅ Test partner account activated successfully!\n');
    console.log('📋 Account Details:');
    console.log('==================');
    console.log(`Email: ${account.email}`);
    console.log(`Account ID: ${account.accountId}`);
    console.log(`Status: ${account.status}`);
    console.log(`Email Verified: ${account.emailVerified}`);
    console.log('\n✅ You can now log in with:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: Test1234!`);
    
  } catch (error: any) {
    console.error('❌ Error activating test partner:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    throw error;
  }
}

activateTestPartner()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });









