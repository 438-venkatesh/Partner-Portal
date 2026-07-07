import 'dotenv/config';
import { dbPool } from './index';
import { mockDataService } from '../services/mockDataService';

async function seed() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Use the mock data service to initialize all data
    const result = await mockDataService.initializeMockData();

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n💡 You can now view and interact with onboarding flows in the UI.');
    console.log('   Navigate to Partner Detail pages to see the onboarding workflows.');

    // Close database connection
    await dbPool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    await dbPool.end().catch(() => {});
    process.exit(1);
  }
}

seed();
