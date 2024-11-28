import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const API_URL = 'https://addressd.vercel.app';
const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY;

async function testCronJob() {
  try {
    console.log('Testing cron job for generating summaries...');
    const response = await axios.post(
      `${API_URL}/api/cron/generate-summaries`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET_KEY}`
        }
      }
    );

    console.log('\nCron Job Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Cron Job Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

testCronJob(); 