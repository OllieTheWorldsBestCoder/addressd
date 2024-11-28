import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

config({ path: resolve(process.cwd(), '.env.local') });

const API_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testFeedback() {
  try {
    // First validate an address
    console.log('Validating address...');
    const validateResponse = await axios.post(`${API_URL}/api/address/validate-frontend`, {
      address: 'Four Furlongs House, Winkfield Road, SL5 7EY'
    });

    const addressId = validateResponse.data.addressId;
    console.log('Address validation response:', validateResponse.data);

    // Then submit feedback
    console.log('\nSubmitting feedback...');
    const feedbackResponse = await axios.post(`${API_URL}/api/address/feedback`, {
      addressId,
      isPositive: true,
      inputAddress: 'Four Furlongs House, Winkfield Road, SL5 7EY',
      matchedAddress: validateResponse.data.summary
    });

    console.log('Feedback response:', feedbackResponse.data);
  } catch (error: any) {
    console.error('Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      response: error.response?.data
    });
  }
}

testFeedback(); 