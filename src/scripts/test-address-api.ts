import { config } from 'dotenv';
import { resolve } from 'path';
import axios, { AxiosError } from 'axios';

config({ path: resolve(process.cwd(), '.env.local') });

const API_URL = 'http://localhost:3000'; // Force local testing
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function testAddressApi(address: string) {
  console.log('\nStarting address validation test...');
  console.log('API URL:', API_URL);
  console.log('Input Address:', address);
  console.log('Auth Token:', AUTH_TOKEN ? 'Present' : 'Missing');
  console.log('Google Maps API Key:', GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');

  try {
    // First try the frontend validation endpoint
    console.log('\nTesting frontend validation endpoint...');
    const frontendResponse = await axios.post(
      `${API_URL}/api/address/validate-frontend`, 
      {
        address,
        apiKey: GOOGLE_MAPS_API_KEY
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => true // Don't throw on any status
      }
    );

    console.log('\nResponse Status:', frontendResponse.status);
    console.log('Response Headers:', frontendResponse.headers);
    console.log('Response Data:', frontendResponse.data);

    if (frontendResponse.status !== 200) {
      console.error('Frontend validation failed:', frontendResponse.data);
      return;
    }

    console.log('Frontend validation successful:', frontendResponse.data);

    // Then try the authenticated endpoint
    console.log('\nTesting authenticated endpoint...');
    const authResponse = await axios.post(
      `${API_URL}/api/address/validate`,
      { 
        address,
        apiKey: GOOGLE_MAPS_API_KEY
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => true // Don't throw on any status
      }
    );

    console.log('\nAuth Response Status:', authResponse.status);
    console.log('Auth Response Headers:', authResponse.headers);
    console.log('Auth Response Data:', authResponse.data);
    if (authResponse.status !== 200) {
      console.error('Auth validation failed:', {
        status: authResponse.status,
        data: authResponse.data,
        headers: authResponse.headers,
        auth: `Bearer ${AUTH_TOKEN?.substring(0, 10)}...`
      });
    }

  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('\nAPI Error:', {
        endpoint: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        config: {
          headers: error.config?.headers,
          data: error.config?.data
        },
        response: error.response?.data
      });

      // Log the full error for debugging
      console.error('\nFull error:', error);
    } else {
      console.error('\nUnexpected error:', error);
    }
  }
}

// Start local server if not running
async function ensureServerRunning() {
  try {
    await axios.get(API_URL);
  } catch (error) {
    console.log('Starting local server...');
    // You might want to add logic here to start the local server if needed
  }
}

const address = process.argv.slice(2).join(' ');
if (!address) {
  console.error('Please provide an address as a command line argument');
  process.exit(1);
}

ensureServerRunning().then(() => testAddressApi(address)); 