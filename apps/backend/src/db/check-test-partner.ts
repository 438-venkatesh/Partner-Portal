import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';
import { partnerUserAccounts, partners } from './schema';
import { eq } from 'drizzle-orm';

async function checkTestPartner() {
  try {
    const testEmail = 'test.partner@example.com';
    
    console.log(`Checking test partner account: ${testEmail}...\n`);

    const [account] = await db
      .select({
        account: partnerUserAccounts,
        partner: partners,
      })
      .from(partnerUserAccounts)
      .innerJoin(partners, eq(partnerUserAccounts.partnerId, partners.partnerId))
      .where(eq(partnerUserAccounts.email, testEmail))
      .limit(1);

    if (!account) {
      console.log('❌ No account found with email:', testEmail);
      return;
    }

    console.log('✅ Account found!\n');
    console.log('📋 Account Details:');
    console.log('==================');
    console.log(`Email: ${account.account.email}`);
    console.log(`Account ID: ${account.account.accountId}`);
    console.log(`Status: ${account.account.status}`);
    console.log(`Email Verified: ${account.account.emailVerified}`);
    console.log(`Locked Until: ${account.account.lockedUntil || 'Not locked'}`);
    console.log(`Failed Login Attempts: ${account.account.failedLoginAttempts}`);
    console.log(`Password Hash: ${account.account.passwordHash.substring(0, 20)}...`);
    console.log('\n📋 Partner Details:');
    console.log('==================');
    console.log(`Partner ID: ${account.partner.partnerId}`);
    console.log(`Partner Name: ${account.partner.partnerName}`);
    console.log(`Partner Status: ${account.partner.status}`);
    console.log('\n🔍 Login Check:');
    console.log('===============');
    console.log(`Account Status Check: ${account.account.status === 'active' ? '✅ PASS' : '❌ FAIL (must be "active")'}`);
    console.log(`Email Verified Check: ${account.account.emailVerified ? '✅ PASS' : '⚠️  WARNING (not verified, but may not be required)'}`);
    console.log(`Account Locked: ${account.account.lockedUntil && account.account.lockedUntil > new Date() ? '❌ LOCKED' : '✅ NOT LOCKED'}`);
    
    if (account.account.status !== 'active') {
      console.log('\n⚠️  Account status is not "active". Updating to active...');
      await db
        .update(partnerUserAccounts)
        .set({ status: 'active' })
        .where(eq(partnerUserAccounts.accountId, account.account.accountId));
      console.log('✅ Account status updated to "active"');
    }
    
  } catch (error: any) {
    console.error('❌ Error checking test partner:', error);
    throw error;
  }
}

checkTestPartner()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });









