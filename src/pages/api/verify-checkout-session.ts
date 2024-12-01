import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PlanType } from '../../types/billing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    if (!session.client_reference_id) {
      throw new Error('No client reference ID found');
    }

    const subscription = session.subscription as Stripe.Subscription;
    const subscriptionItem = subscription.items.data[0];

    // Update user with subscription details
    const userRef = doc(db, 'users', session.client_reference_id);
    await updateDoc(userRef, {
      'billing.stripeCustomerId': session.customer as string,
      'billing.apiSubscriptionItemId': subscriptionItem.id,
      'billing.plans': arrayUnion({
        type: PlanType.API,
        status: 'active',
        minimumSpend: 5000, // £50
        ratePerCall: 0.5, // £0.005
        currentUsage: 0,
        billingStartDate: new Date(),
        contributionPoints: 0,
        stripeSubscriptionId: subscription.id
      })
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error verifying checkout session:', error);
    return res.status(500).json({ 
      error: 'Failed to verify checkout session',
      details: error.message 
    });
  }
} 