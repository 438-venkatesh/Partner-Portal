/**
 * Alternative Seed Script - Creates sample data via API calls
 * 
 * This script can be used if you don't have direct database access.
 * It requires the backend server to be running.
 * 
 * Usage:
 *   1. Start the backend server: pnpm dev
 *   2. In another terminal, run: tsx src/db/seed-via-api.ts
 * 
 * Note: You'll need a valid auth token. Set it in localStorage or as an environment variable.
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AUTH_TOKEN}`,
  },
});

const samplePartners = [
  {
    partnerName: 'Digital Marketing Agency Inc.',
    displayName: 'Digital Marketing Agency',
    partnerType: 'agency',
    businessType: 'b2b',
    description: 'Full-service digital marketing agency specializing in SEO and content marketing',
    website: 'https://digitalmarketing.example.com',
    tier: 'gold',
  },
  {
    partnerName: 'Tech Solutions Reseller',
    displayName: 'Tech Solutions',
    partnerType: 'reseller',
    businessType: 'b2b',
    description: 'Authorized reseller of enterprise software solutions',
    website: 'https://techsolutions.example.com',
    tier: 'silver',
  },
  {
    partnerName: 'Global Manufacturing Supplies Ltd.',
    displayName: 'Global Manufacturing',
    partnerType: 'supplier',
    businessType: 'b2b',
    description: 'Leading supplier of raw materials and components',
    website: 'https://globalmfg.example.com',
    tier: 'platinum',
  },
  {
    partnerName: 'Express Logistics Services',
    displayName: 'Express Logistics',
    partnerType: 'logistics_partner',
    businessType: 'b2b',
    description: 'Nationwide logistics and transportation services',
    website: 'https://expresslogistics.example.com',
    tier: 'gold',
  },
  {
    partnerName: 'Enterprise Integration Solutions',
    displayName: 'Enterprise Integration',
    partnerType: 'integrator',
    businessType: 'b2b',
    description: 'Enterprise system integration and consulting services',
    website: 'https://enterpriseintegration.example.com',
    tier: 'platinum',
  },
  {
    partnerName: 'Complete Supply Chain Solutions',
    displayName: 'Supply Chain Solutions',
    partnerType: 'supplier_logistics',
    businessType: 'b2b',
    description: 'Integrated supplier and logistics services',
    website: 'https://supplychain.example.com',
    tier: 'platinum',
  },
];

async function seedViaAPI() {
  try {
    console.log('🌱 Starting API-based seeding...\n');
    console.log(`Using API: ${API_BASE_URL}\n`);

    const createdPartners = [];

    for (const partnerData of samplePartners) {
      try {
        console.log(`Creating partner: ${partnerData.partnerName}...`);
        const response = await apiClient.post('/partners', partnerData);
        createdPartners.push(response.data);
        console.log(`✅ Created: ${partnerData.partnerName} (${response.data.partnerId})\n`);
      } catch (error: any) {
        console.error(`❌ Failed to create ${partnerData.partnerName}:`, error.response?.data || error.message);
      }
    }

    console.log('\n📊 Seed Summary:');
    console.log(`  - Partners Created: ${createdPartners.length}`);
    console.log('\n✅ API-based seeding completed!');
    console.log('\n💡 Onboarding workflows are automatically created when partners are created.');
    console.log('   Navigate to Partner Detail pages in the UI to view onboarding flows.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedViaAPI();









