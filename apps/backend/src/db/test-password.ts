import 'dotenv/config';
import { db } from './index';
import { partnerUserAccounts } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function testPassword() {
  try {
    const testEmail = 'test.partner@example.com';
    const testPassword = 'Test1234!';
    
    console.log('Testing password comparison...\n');
    
    const [account] = await db
      .select()
      .from(partnerUserAccounts)
      .where(eq(partnerUserAccounts.email, testEmail))
      .limit(1);
    
    if (!account) {
      console.log('❌ Account not found');
      return;
    }
    
    console.log('Account found:');
    console.log(`Email: ${account.email}`);
    console.log(`Password Hash: ${account.passwordHash}`);
    console.log(`Test Password: ${testPassword}\n`);
    
    console.log('Comparing passwords...');
    const isValid = await bcrypt.compare(testPassword, account.passwordHash);
    console.log(`Password comparison result: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`);
    
    if (!isValid) {
      console.log('⚠️  Password mismatch detected!');
      console.log('Generating new hash for Test1234!...');
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log(`New hash: ${newHash}`);
      console.log('\nUpdating password hash in database...');
      
      await db
        .update(partnerUserAccounts)
        .set({ passwordHash: newHash })
        .where(eq(partnerUserAccounts.accountId, account.accountId));
      
      console.log('✅ Password hash updated!');
      
      // Test again
      const isValidAfterUpdate = await bcrypt.compare(testPassword, newHash);
      console.log(`Password comparison after update: ${isValidAfterUpdate ? '✅ VALID' : '❌ INVALID'}`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  }
}

testPassword()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });









