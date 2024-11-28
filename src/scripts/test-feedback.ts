import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const API_URL = 'http://localhost:3000';  // Use local development server

async function testFeedback() {
  try {
    // First validate an address
    const validateResponse = await axios.post(`${API_URL}/api/address/validate-frontend`, {
      address: "Four Furlongs House, Winkfield Road, Ascot SL5 7EY, UK"
    });

    console.log('Address validation response:', validateResponse.data);

    // Then submit feedback
    const feedbackResponse = await axios.post(`${API_URL}/api/address/feedback`, {
      addressId: validateResponse.data.addressId,
      isPositive: true,
      inputAddress: "Four Furlongs House, Winkfield Road",
      matchedAddress: validateResponse.data.summary
    });

    console.log('Feedback submission response:', feedbackResponse.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

testFeedback(); 