import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { PlanType, BillingPlan } from '../../../types/billing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Return 200 immediately as recommended by Stripe
  res.status(200).end();

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
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout completion:', session);

  if (!session.client_reference_id) {
    console.error('No client_reference_id found in session');
    throw new Error('No client_reference_id found in session');
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  console.log('Retrieved subscription:', subscription);

  const userRef = doc(db, 'users', session.client_reference_id);
  const userData = await getDoc(userRef);
  
  if (!userData.exists()) {
    console.error('User not found:', session.client_reference_id);
    return;
  }

  // Determine plan type from metadata
  const planType = subscription.metadata.plan_type as PlanType;
  const addressId = subscription.metadata.addressId;

  // Create the base plan object
  let plan: Partial<BillingPlan> = {
    type: planType,
    status: 'active',
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
  console.log('Updated user billing info');
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.error('No user ID found in subscription metadata');
    return;
  }

  const userRef = doc(db, 'users', userId);
  const userData = (await getDoc(userRef)).data();
  
  if (!userData) {
    console.error('User not found:', userId);
    return;
  }

  const updatedPlans = userData.billing.plans.map((plan: BillingPlan) => {
    if (plan.stripeSubscriptionId === subscription.id) {
      let status = plan.status;
      if (subscription.cancel_at_period_end) {
        status = 'cancelling';
      } else if (subscription.status === 'active') {
        status = 'active';
      } else if (subscription.status === 'past_due') {
        status = 'past_due';
      } else {
        status = 'cancelled';
      }

      return {
        ...plan,
        status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      };
    }
    return plan;
  });

  await updateDoc(userRef, {
    'billing.plans': updatedPlans
  });
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.error('No user ID found in subscription metadata');
    return;
  }

  const userRef = doc(db, 'users', userId);
  const userData = (await getDoc(userRef)).data();
  
  if (!userData) {
    console.error('User not found:', userId);
    return;
  }

  const updatedPlans = userData.billing.plans.map((plan: BillingPlan) => {
    if (plan.stripeSubscriptionId === subscription.id) {
      return {
        ...plan,
        status: 'cancelled',
        endDate: new Date(subscription.ended_at ? subscription.ended_at * 1000 : Date.now())
      };
    }
    return plan;
  });

  // If this was an embed subscription, also update the activeEmbeds array
  if (subscription.metadata.plan_type === 'embed' && subscription.metadata.addressId) {
    const activeEmbeds = userData.embedAccess?.activeEmbeds || [];
    const updatedEmbeds = activeEmbeds.filter(
      (embed: any) => embed.addressId !== subscription.metadata.addressId
    );

    await updateDoc(userRef, {
      'billing.plans': updatedPlans,
      'embedAccess.activeEmbeds': updatedEmbeds
    });
  } else {
    await updateDoc(userRef, {
      'billing.plans': updatedPlans
    });
  }
} 