import { config } from 'dotenv';
import { resolve } from 'path';
import axios, { AxiosError } from 'axios';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const API_URL = 'https://addressd.vercel.app';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

async function testAddressApi(address: string) {
  console.log('Testing address:', address);
  const endpoint = `${API_URL}/api/address/validate`;
  console.log('Making request to:', endpoint);
  
  try {
    const response = await axios.post(endpoint, {
      address,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    console.log('\nAPI Response:', JSON.stringify(response.data, null, 2));
    console.log('\nTo test the upload page, visit this URL in your browser:');
    console.log(response.data.uploadLink);
    
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('\nAPI Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        response: error.response?.data
      });
    } else {
      console.error('\nUnexpected error:', error);
    }
  }
}

const address = process.argv.slice(2).join(' ');

if (!address) {
  console.error('Please provide an address as a command line argument');
  process.exit(1);
}

console.log('Using API URL:', API_URL);
testAddressApi(address); 