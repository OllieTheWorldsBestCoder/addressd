import { config } from 'dotenv';
import { resolve } from 'path';
import { BillingService } from '../services/billing.service';
import { User } from '../types/user';
import { PlanType } from '../types/billing';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import crypto from 'crypto';
import Stripe from 'stripe';

config({ path: resolve(process.cwd(), '.env.local') });

const billingService = new BillingService();

async function createTestUser(): Promise<User> {
  const userId = `test_${crypto.randomBytes(8).toString('hex')}`;
  const testUser: User = {
    id: userId,
    name: 'Test User',
    email: 'test@addressd.app',
    authToken: crypto.randomBytes(32).toString('hex'),
    summaryCount: 0,
    contributionPoints: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    billing: {
      plans: [], // Initialize as empty array, not undefined
      stripeCustomerId: undefined
    }
  };

  await setDoc(doc(db, 'users', userId), testUser);
  return testUser;
}

async function testStripeIntegration() {
  try {
    console.log('🏁 Starting Stripe integration test...\n');

    // 1. Create test user
    console.log('1️⃣ Creating test user...');
    const testUser = await createTestUser();
    console.log('✅ Test user created:', testUser.id);

    // 2. Create Stripe customer
    console.log('\n2️⃣ Creating Stripe customer...');
    const customer = await billingService.createCustomer(testUser);
    console.log('✅ Stripe customer created:', customer.id);

    // 3. Create API subscription
    console.log('\n3️⃣ Creating API subscription...');
    const subscription = await billingService.createSubscription(
      {
        ...testUser,
        billing: {
          plans: [], // Explicitly set as empty array
          stripeCustomerId: customer.id
        }
      },
      PlanType.API
    );
    console.log('✅ API subscription created:', subscription.id);

    // 4. Track some API usage
    console.log('\n4️⃣ Tracking API usage...');
    await billingService.trackApiUsage(testUser.id, 10);
    console.log('✅ API usage tracked');

    // 5. Update subscription
    console.log('\n5️⃣ Updating subscription...');
    const updated = await billingService.updateSubscription(
      {
        ...testUser,
        billing: {
          plans: [{
            type: PlanType.API,
            status: 'active',
            minimumSpend: 6000,
            ratePerCall: 0.6,
            currentUsage: 10,
            billingStartDate: new Date(),
            contributionPoints: 0,
            stripeSubscriptionId: subscription.id
          }],
          stripeCustomerId: customer.id
        }
      },
      PlanType.API
    ) as Stripe.Subscription; // Type assertion since we know it's API subscription
    console.log('✅ Subscription updated:', updated.id);

    // 6. Cancel subscription
    console.log('\n6️⃣ Canceling subscription...');
    const canceled = await billingService.cancelSubscription(
      {
        ...testUser,
        billing: {
          plans: [{
            type: PlanType.API,
            status: 'active',
            minimumSpend: 6000,
            ratePerCall: 0.6,
            currentUsage: 10,
            billingStartDate: new Date(),
            contributionPoints: 0,
            stripeSubscriptionId: subscription.id
          }],
          stripeCustomerId: customer.id
        }
      },
      PlanType.API
    );
    console.log('✅ Subscription canceled:', canceled.id);

    // 7. Verify final state
    console.log('\n7️⃣ Verifying final state...');
    const finalUserDoc = await getDoc(doc(db, 'users', testUser.id));
    const finalUser = finalUserDoc.data();
    console.log('Final user state:', JSON.stringify(finalUser, null, 2));

    console.log('\n✨ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testStripeIntegration(); 