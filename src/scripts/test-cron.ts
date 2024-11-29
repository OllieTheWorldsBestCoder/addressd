import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

config({ path: resolve(process.cwd(), '.env.local') });

const API_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY;

async function testCron() {
  try {
    console.log('Testing address optimization cron job...\n');

    // Test address optimization
    const optimizeResponse = await axios.post(
      `${API_URL}/api/cron/optimize-addresses`,
      {},
      {
        headers: {
          Authorization: `Bearer ${CRON_SECRET_KEY}`
        }
      }
    );

    console.log('Address Optimization Results:', JSON.stringify(optimizeResponse.data, null, 2));

    // Test summary generation
    console.log('\nTesting summary generation cron job...\n');
    
    const summaryResponse = await axios.post(
      `${API_URL}/api/cron/generate-summaries`,
      {},
      {
        headers: {
          Authorization: `Bearer ${CRON_SECRET_KEY}`
        }
      }
    );

    console.log('Summary Generation Results:', JSON.stringify(summaryResponse.data, null, 2));

  } catch (error: any) {
    console.error('Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

// Run the test
testCron(); 