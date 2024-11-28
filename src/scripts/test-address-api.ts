import axios, { AxiosError } from 'axios';

async function testAddressApi(address: string) {
  console.log('Testing address:', address);
  console.log('Making request to: http://localhost:3000/api/address/validate');
  
  try {
    const response = await axios.post('http://localhost:3000/api/address/validate', {
      address,
    });

    console.log('API Response:', response.data);
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Get address from command line arguments
const address = process.argv[2];

if (!address) {
  console.error('Please provide an address as a command line argument');
  process.exit(1);
}

testAddressApi(address); 