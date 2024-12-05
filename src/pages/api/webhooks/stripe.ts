import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import { stripe } from '../../../config/stripe';
import type Stripe from 'stripe';
import { doc, updateDoc, arrayUnion, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { PlanType, BillingPlan } from '../../../types/billing';
import { User } from '../../../types/user';
import { randomBytes } from 'crypto';
import { trackCheckoutSuccess, trackCheckoutError } from '../../../utils/analytics';

type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'cancelling';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to find user by Stripe customer ID
async function findUserByCustomerId(customerId: string, clientReferenceId?: string): Promise<User> {
  const usersRef = collection(db, 'users');
  
  // First try to find by client reference ID if provided
  if (clientReferenceId) {
    const userDoc = await getDoc(doc(usersRef, clientReferenceId));
    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data()
      } as User;
    }
  }

  // If not found by client reference ID, try customer ID
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
  try {
    if (!session.client_reference_id) {
      throw new Error('No client_reference_id found in session');
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const userRef = doc(db, 'users', session.client_reference_id);
    const userData = await getDoc(userRef);
    
    if (!userData.exists()) {
      throw new Error('User not found: ' + session.client_reference_id);
    }

    // Get metadata from the session
    const planType = session.metadata?.plan_type as PlanType;
    const addressId = session.metadata?.addressId;
    const billingPeriod = session.metadata?.billing_period as 'monthly' | 'yearly';
    const amount = parseInt(session.metadata?.amount || '0');

    if (!planType || !addressId || !billingPeriod) {
      throw new Error('Missing required metadata');
    }

    // Track successful checkout
    trackCheckoutSuccess(planType, billingPeriod, amount);

    // Check if plan already exists
    const userDataObj = userData.data();
    const existingPlans = userDataObj?.billing?.plans || [];
    const planExists = existingPlans.some((plan: any) => 
      plan.addressId === addressId && 
      plan.stripeSubscriptionId === subscription.id
    );

    if (planExists) {
      console.log('Plan already exists, skipping creation');
      return;
    }

    // Create the base plan object
    const status: SubscriptionStatus = 'active';
    const plan = {
      type: planType,
      status,
      startDate: new Date(),
      stripeSubscriptionId: subscription.id,
      addressId,
      billingPeriod,
      priceMonthly: 300, // £3
      priceYearly: 2000, // £20
      currentPrice: billingPeriod === 'yearly' ? 2000 : 300
    };

    // Ensure user has an embed token
    let embedToken = userDataObj?.embedAccess?.embedToken;
    if (!embedToken) {
      embedToken = randomBytes(32).toString('hex');
    }

    // Remove any existing activeEmbeds for this addressId
    const existingEmbeds = userDataObj?.embedAccess?.activeEmbeds || [];
    const updatedEmbeds = existingEmbeds.filter((embed: any) => embed.addressId !== addressId);

    // Add the new embed
    const newEmbed = {
      addressId: addressId,
      domain: 'pending', // Will be updated on first embed view
      createdAt: new Date(),
      lastUsed: new Date(),
      viewCount: 0
    };

    // Update user with subscription details
    const updates: any = {
      'billing.stripeCustomerId': session.customer as string,
      'billing.plans': arrayUnion(plan),
      'embedAccess.embedToken': embedToken,
      'embedAccess.isEmbedUser': true,
      'embedAccess.activeEmbeds': [...updatedEmbeds, newEmbed]
    };

    await updateDoc(userRef, updates);
  } catch (error) {
    // Track checkout error
    trackCheckoutError(error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // Find user by customer ID or client reference ID from metadata
    const user = await findUserByCustomerId(
      subscription.customer as string,
      subscription.metadata?.userId
    );
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
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          endDate: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : undefined
        };
      }
      return plan;
    }) || [];

    await updateDoc(userRef, {
      'billing.plans': updatedPlans
    });
  } catch (error) {
    console.error('Error handling subscription update:', error);
    throw error;
  }
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