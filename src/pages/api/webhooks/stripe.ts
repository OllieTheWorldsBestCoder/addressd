import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { doc, updateDoc, arrayUnion, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { PlanType, BillingPlan } from '../../../types/billing';
import { User } from '../../../types/user';

type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'cancelling';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
});

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to find user by Stripe customer ID
async function findUserByCustomerId(customerId: string): Promise<User> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('billing.stripeCustomerId', '==', customerId));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    throw new Error('User not found for customer: ' + customerId);
  }

  const userData = snapshot.docs[0].data() as Omit<User, 'id'>;
  return {
    id: snapshot.docs[0].id,
    ...userData
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature']!;
    
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    console.log(`Processing webhook event: ${event.type}`, {
      id: event.id,
      type: event.type,
      object: event.data.object
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!session.client_reference_id) {
    throw new Error('No client_reference_id found in session');
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const userRef = doc(db, 'users', session.client_reference_id);
  const userData = await getDoc(userRef);
  
  if (!userData.exists()) {
    throw new Error('User not found: ' + session.client_reference_id);
  }

  // Determine plan type from metadata
  const planType = subscription.metadata.plan_type as PlanType;
  const addressId = subscription.metadata.addressId;

  // Create the base plan object
  const status: SubscriptionStatus = 'active';
  let plan: Partial<BillingPlan> = {
    type: planType,
    status,
    startDate: new Date(),
    stripeSubscriptionId: subscription.id,
  };

  // Add plan-specific fields
  if (planType === PlanType.EMBED && addressId) {
    plan = {
      ...plan,
      type: PlanType.EMBED,
      priceMonthly: 300, // £3
      priceYearly: 2000, // £20
      addressId: addressId
    };
  } else if (planType === PlanType.API) {
    plan = {
      ...plan,
      type: PlanType.API,
      minimumSpend: 5000, // £50
      ratePerCall: 0.5, // £0.005
      currentUsage: 0,
      billingStartDate: new Date(),
      contributionPoints: 0
    };
  }

  // Update user with subscription details
  const updates: any = {
    'billing.stripeCustomerId': session.customer as string,
    'billing.plans': arrayUnion(plan)
  };

  // For embed subscriptions, also update the activeEmbeds array
  if (planType === PlanType.EMBED && addressId) {
    updates['embedAccess.activeEmbeds'] = arrayUnion({
      addressId: addressId,
      domain: 'pending', // Will be updated on first embed view
      createdAt: new Date(),
      lastUsed: new Date(),
      viewCount: 0
    });
  }

  await updateDoc(userRef, updates);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Find user by customer ID
  const user = await findUserByCustomerId(subscription.customer as string);
  const userRef = doc(db, 'users', user.id);

  const updatedPlans = user.billing?.plans?.map((plan: BillingPlan) => {
    if (plan.stripeSubscriptionId === subscription.id) {
      let status: SubscriptionStatus = plan.status as SubscriptionStatus;
      
      if (subscription.cancel_at_period_end) {
        status = 'cancelling';
      } else if (subscription.status === 'active') {
        status = 'active';
      } else if (subscription.status === 'past_due') {
        status = 'past_due';
      } else if (subscription.status === 'canceled') {
        status = 'cancelled';
      }

      return {
        ...plan,
        status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      };
    }
    return plan;
  }) || [];

  await updateDoc(userRef, {
    'billing.plans': updatedPlans
  });
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  // Find user by customer ID
  const user = await findUserByCustomerId(subscription.customer as string);
  const userRef = doc(db, 'users', user.id);

  // Find the subscription in the user's plans
  const plan = user.billing?.plans?.find((p: BillingPlan) => 
    p.stripeSubscriptionId === subscription.id
  );

  if (!plan) {
    throw new Error('Subscription not found in user plans');
  }

  // Update the plans array
  const updatedPlans = user.billing?.plans?.map((p: BillingPlan) => {
    if (p.stripeSubscriptionId === subscription.id) {
      return {
        ...p,
        status: 'cancelled' as SubscriptionStatus,
        endDate: new Date(subscription.ended_at ? subscription.ended_at * 1000 : Date.now())
      };
    }
    return p;
  }) || [];

  // If this was an embed subscription, remove it from activeEmbeds
  if (plan.type === PlanType.EMBED && plan.addressId) {
    const activeEmbeds = user.embedAccess?.activeEmbeds?.filter(
      (embed: any) => embed.addressId !== plan.addressId
    ) || [];

    await updateDoc(userRef, {
      'billing.plans': updatedPlans,
      'embedAccess.activeEmbeds': activeEmbeds
    });
  } else {
    await updateDoc(userRef, {
      'billing.plans': updatedPlans
    });
  }
} 