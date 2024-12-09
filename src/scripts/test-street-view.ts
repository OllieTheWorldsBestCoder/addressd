import { config } from 'dotenv';
import { resolve } from 'path';
import { AddressService } from '../services/address.service';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Verify environment variables are loaded
console.log('Environment check:', {
  hasFirebaseKey: !!process.env.FIREBASE_API_KEY,
  hasGoogleMapsKey: !!process.env.GOOGLE_MAPS_API_KEY,
  hasOpenAIKey: !!process.env.OPENAI_API_KEY
});

async function testStreetView() {
  try {
    console.log('\n=== Starting Street View Integration Test ===\n');
    
    // Test addresses with known Street View coverage
    const testAddresses = [
      "10 Downing Street, London",
      "1600 Pennsylvania Avenue NW, Washington, DC",
      "350 5th Ave, New York, NY 10118", // Empire State Building
      "221B Baker St, London",
      "82a Market Street, St Andrews KY16 9PA"
    ];

    const addressService = new AddressService();
    console.log('AddressService initialized');

    for (const address of testAddresses) {
      console.log(`\n=== Testing address: "${address}" ===`);
      
      try {
        console.log('1. Creating/updating address...');
        const result = await addressService.createOrUpdateAddress(address);
        
        if (!result) {
          console.error('Failed to create/update address - no result returned');
          continue;
        }

        console.log('2. Address processing results:');
        console.log('- ID:', result.id);
        console.log('- Formatted Address:', result.formattedAddress);
        console.log('- Street View URL:', result.streetViewUrl || 'Not available');
        console.log('- Summary:', result.summary);
        console.log('- Location:', JSON.stringify(result.location));
        
        if (!result.streetViewUrl) {
          console.warn('No Street View URL generated for this address');
        }
        
        console.log('\nTest completed for this address');
        console.log('=' .repeat(50));
        
      } catch (error) {
        console.error(`Error processing address "${address}":`);
        console.error('Full error:', error);
        if (error instanceof Error) {
          console.error('Stack trace:', error.stack);
        }
      }
    }

  } catch (error) {
    console.error('Test failed with error:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
console.log('Starting test execution...');
testStreetView()
  .then(() => {
    console.log('\nTest completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest failed:', error);
    process.exit(1);
  }); 