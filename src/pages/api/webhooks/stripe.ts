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
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!session.client_reference_id) {
    throw new Error('No client_reference_id found in session');
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const userRef = doc(db, 'users', session.client_reference_id);
  
  const priceId = subscription.items.data[0].price.id;
  const isYearly = priceId === process.env.STRIPE_EMBED_YEARLY_PRICE_ID;

  await updateDoc(userRef, {
    'billing.stripeCustomerId': session.customer as string,
    'billing.plans': arrayUnion({
      type: PlanType.EMBED,
      status: 'active',
      priceMonthly: 300, // £3
      priceYearly: 2000, // £20
      startDate: new Date(),
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      isYearly
    })
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userRef = doc(db, 'users', subscription.metadata.userId);
  const userData = (await getDoc(userRef)).data();

  if (!userData) return;

  const updatedPlans = userData.billing.plans.map((plan: BillingPlan) => {
    if (plan.stripeSubscriptionId === subscription.id) {
      return {
        ...plan,
        status: subscription.status,
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
  const userRef = doc(db, 'users', subscription.metadata.userId);
  const userData = (await getDoc(userRef)).data();

  if (!userData) return;

  const updatedPlans = userData.billing.plans.map((plan: BillingPlan) => {
    if (plan.stripeSubscriptionId === subscription.id) {
      return {
        ...plan,
        status: 'cancelled',
        canceledAt: new Date()
      };
    }
    return plan;
  });

  await updateDoc(userRef, {
    'billing.plans': updatedPlans
  });
} 