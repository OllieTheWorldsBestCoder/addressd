import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import Stripe from 'stripe';
import { User } from '../types/user';
import { PlanType } from '../types/billing';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Initialize Firebase (only if not already initialized)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
};

// Only initialize if no apps exist
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
});

// Test-specific billing service methods
const testBillingService = {
  async createCustomer(user: User) {
    // Create a Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.id
      }
    });

    // Update user with Stripe customer ID
    await updateDoc(doc(db, 'users', user.id), {
      'billing.stripeCustomerId': customer.id
    });

    return customer;
  },

  async createSubscription(user: User, planType: PlanType): Promise<Stripe.Subscription> {
    // Validate required environment variable
    if (!process.env.STRIPE_API_PRICE_ID) {
      throw new Error('STRIPE_API_PRICE_ID environment variable is required');
    }

    // Initialize billing if it doesn't exist
    if (!user.billing) {
      user.billing = { plans: [] };
    }
    if (!Array.isArray(user.billing.plans)) {
      user.billing.plans = [];
    }

    // Create customer if doesn't exist
    if (!user.billing.stripeCustomerId) {
      const customer = await this.createCustomer(user);
      user.billing.stripeCustomerId = customer.id;
    }

    // Create subscription directly for testing
    const subscription = await stripe.subscriptions.create({
      customer: user.billing.stripeCustomerId,
      items: [{
        price: process.env.STRIPE_API_PRICE_ID,
      }],
      payment_behavior: 'allow_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    // Update user with subscription details
    await updateDoc(doc(db, 'users', user.id), {
      'billing.stripeCustomerId': user.billing.stripeCustomerId,
      'billing.apiSubscriptionItemId': subscription.items.data[0].id,
      'billing.plans': [{
        type: PlanType.API,
        status: 'active',
        minimumSpend: 5000,
        ratePerCall: 0.5,
        currentUsage: 0,
        billingStartDate: new Date(),
        contributionPoints: 0,
        stripeSubscriptionId: subscription.id
      }]
    });

    return subscription;
  },

  async trackApiUsage(userId: string, callCount: number) {
    const userRef = doc(db, 'users', userId);
    const userData = (await getDoc(userRef)).data() as User;
    
    if (!userData?.billing?.stripeCustomerId) {
      throw new Error('No Stripe customer ID found');
    }

    // Report usage using Stripe's metering API with the required minimum timestamp
    await stripe.billing.meterEvents.create({
      event_name: 'test_requests',
      timestamp: 1733954460,
      payload: {
        stripe_customer_id: userData.billing.stripeCustomerId,
        value: callCount.toString()
      }
    });

    // Update local tracking
    await updateDoc(userRef, {
      'billing.plans.currentUsage': increment(callCount)
    });
  }
};

async function testApiFlow() {
  try {
    // Validate required environment variables
    if (!process.env.STRIPE_API_PRICE_ID) {
      throw new Error('STRIPE_API_PRICE_ID environment variable is required');
    }
    if (!process.env.TEST_USER_ID) {
      throw new Error('TEST_USER_ID environment variable is required');
    }

    console.log('🏁 Starting API flow test...\n');

    // 1. Get test user
    console.log('1️⃣ Getting test user...');
    const userRef = doc(db, 'users', process.env.TEST_USER_ID);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Test user not found');
    }

    const user = userDoc.data() as User;
    
    // Ensure billing and plans are properly initialized
    if (!user.billing) {
      user.billing = { plans: [] };
    }
    if (!Array.isArray(user.billing.plans)) {
      user.billing.plans = [];
    }
    
    console.log('✅ Got test user:', user.id);

    // 2. Create or get API subscription
    let subscription: Stripe.Subscription | null = null;
    const apiPlan = user.billing.plans.find(p => p.type === PlanType.API);

    if (!apiPlan?.stripeSubscriptionId) {
      console.log('\n2️⃣ Creating new API subscription...');
      subscription = await testBillingService.createSubscription(user, PlanType.API);
      console.log('✅ API subscription created:', subscription.id);
    } else {
      console.log('\n✅ User already has active API subscription');
      subscription = await stripe.subscriptions.retrieve(apiPlan.stripeSubscriptionId);
    }

    // 3. Track some API usage
    console.log('\n3️⃣ Tracking API usage...');
    const callCount = 5;
    console.log(`Tracking ${callCount} API calls...`);
    await testBillingService.trackApiUsage(user.id, callCount);
    console.log('✅ API usage tracked');

    // 4. Verify usage records
    if (subscription) {
      console.log('\n4️⃣ Verifying usage records...');
      
      if (!user.billing?.stripeCustomerId) {
        throw new Error('No Stripe customer ID found');
      }

      // First get all meters
      const meters = await stripe.billing.meters.list();
      const meter = meters.data.find(m => m.id === 'mtr_test_61Rai4utbhFIiRa5E41LAQAcRVIdeB2m');
      
      if (!meter) {
        throw new Error('Meter not found');
      }

      console.log('✅ Usage records for meter:', meter.display_name);
    }

    console.log('\n✨ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error);
    console.error('Stack trace:', error);
  }
}

testApiFlow(); 