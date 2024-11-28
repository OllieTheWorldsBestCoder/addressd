import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

config({ path: resolve(process.cwd(), '.env.local') });

const API_URL = 'http://localhost:3000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

const testCases = [
  // Basic cases
  "35 W Smithfield, London EC1A, UK",
  "flat 35, ec1a 9hx",
  
  // Edge cases
  "Flat 3, 35 West Smithfield, London",
  "EC1A 9HX",
  "35 West Smithfield",
  
  // Invalid cases
  "invalid address",
  "",
  "123"
];

async function runTests() {
  console.log('Starting address validation tests...\n');

  for (const address of testCases) {
    console.log(`\n=== Testing address: "${address}" ===`);
    
    try {
      // Test frontend validation
      const frontendResponse = await axios.post(
        `${API_URL}/api/address/validate-frontend`,
        { address },
        {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: (status) => true
        }
      );

      console.log('\nFrontend Validation:');
      console.log('Status:', frontendResponse.status);
      console.log('Response:', frontendResponse.data);

      // Only test authenticated endpoint if frontend validation succeeded
      if (frontendResponse.status === 200) {
        const authResponse = await axios.post(
          `${API_URL}/api/address/validate`,
          { address },
          {
            headers: {
              'Authorization': `Bearer ${AUTH_TOKEN}`,
              'Content-Type': 'application/json'
            },
            validateStatus: (status) => true
          }
        );

        console.log('\nAuthenticated Validation:');
        console.log('Status:', authResponse.status);
        console.log('Response:', authResponse.data);
      }

    } catch (error) {
      console.error('Error testing address:', error);
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

runTests(); 