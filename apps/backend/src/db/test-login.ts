import 'dotenv/config';
import { partnerAuthService } from '../services/partnerAuthService';

async function testLogin() {
  try {
    const email = 'test.partner@example.com';
    const password = 'Test1234!';
    
    console.log('Testing login function...\n');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}\n`);
    
    const result = await partnerAuthService.login(email, password, '127.0.0.1');
    
    console.log('✅ Login successful!\n');
    console.log('📋 User Details:');
    console.log('================');
    console.log(`Account ID: ${result.user.accountId}`);
    console.log(`Email: ${result.user.email}`);
    console.log(`Name: ${result.user.firstName} ${result.user.lastName}`);
    console.log(`Partner ID: ${result.user.partnerId}`);
    console.log(`Partner Name: ${result.user.partnerName}`);
    console.log(`Partner Status: ${result.user.partnerStatus}`);
    
  } catch (error: any) {
    console.error('❌ Login failed!');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

testLogin()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });









