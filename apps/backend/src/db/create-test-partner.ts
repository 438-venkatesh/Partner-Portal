import 'dotenv/config';
import { partnerAuthService } from '../services/partnerAuthService';

async function createTestPartner() {
  try {
    console.log('Creating test partner account...\n');

    const testData = {
      partnerName: 'Test Partner Organization',
      displayName: 'Test Partner',
      partnerType: 'reseller' as const,
      businessType: 'b2b' as const,
      website: 'https://test-partner.example.com',
      description: 'This is a test partner account for development and testing purposes',
      email: 'test.partner@example.com',
      password: 'Test1234!', // Known password for testing
      firstName: 'Test',
      lastName: 'Admin',
      phone: '+1-555-0123',
    };

    const result = await partnerAuthService.registerPartner(testData);

    console.log('✅ Test partner account created successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('====================');
    console.log(`Email: ${result.account.email}`);
    console.log(`Password: ${testData.password}`);
    console.log('\n📋 Partner Details:');
    console.log('==================');
    console.log(`Partner Name: ${result.partner.partnerName}`);
    console.log(`Partner Code: ${result.partner.partnerCode}`);
    console.log(`Partner Type: ${result.partner.partnerType}`);
    console.log(`Partner Status: ${result.partner.status}`);
    console.log(`Account ID: ${result.account.accountId}`);
    console.log(`Email Verification Token: ${result.account.emailVerificationToken}`);
    console.log('\n⚠️  Note: Account status is "pending_verification".');
    console.log('   You may need to verify the email or update the account status to "active" for login.');
    console.log('\n💡 To activate the account, you can:');
    console.log('   1. Use the email verification endpoint with the token above');
    console.log('   2. Or manually update the account status in the database');
    
  } catch (error: any) {
    console.error('❌ Error creating test partner:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    throw error;
  }
}

createTestPartner()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });









