import { config } from 'dotenv';
import { resolve } from 'path';
import { BillingService } from '../services/billing.service';

config({ path: resolve(process.cwd(), '.env.local') });

async function testApiMetering() {
  const billingService = new BillingService();
  
  try {
    // Get test user ID from your test run
    const userId = 'test_user_id';
    
    // Track some API usage
    console.log('Tracking API usage...');
    await billingService.trackApiUsage(userId, 10);
    
    // Wait a bit and verify in Stripe Dashboard
    console.log('Check Stripe Dashboard for usage records');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testApiMetering(); 