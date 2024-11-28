import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

config({ path: resolve(process.cwd(), '.env.local') });

const API_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY;

async function testCron() {
  try {
    console.log('Testing cron job for generating summaries...\n');

    const response = await axios.post(
      `${API_URL}/api/cron/optimize-addresses`,
      {},
      {
        headers: {
          Authorization: `Bearer ${CRON_SECRET_KEY}`
        }
      }
    );

    console.log('Cron Job Response:', JSON.stringify(response.data, null, 2));

    // Test optimization results
    if (response.data.results) {
      console.log('\nOptimization Results:');
      console.log(`Total addresses processed: ${response.data.results.total}`);
      console.log(`Updated addresses: ${response.data.results.updated.length}`);
      console.log(`Skipped addresses: ${response.data.results.skipped.length}`);
      console.log(`Errors: ${response.data.results.errors.length}`);
    }
  } catch (error: any) {
    console.error('Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

testCron(); 