import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Log Stripe configuration
const stripeKey = process.env.STRIPE_SECRET_KEY!;
console.log('Stripe Configuration:', {
  keyType: stripeKey.substring(0, 7),
  isLiveMode: stripeKey.startsWith('sk_live_')
});

const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
  appInfo: {
    name: 'Addressd',
    version: '1.0.0'
  },
  telemetry: false
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, userId } = req.body;

    if (!sessionId || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('Verifying checkout session:', { 
      sessionId, 
      userId,
      stripeMode: stripeKey.startsWith('sk_live_') ? 'live' : 'test'
    });

    // Retrieve the session with expanded subscription data
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.latest_invoice']
    });

    console.log('Retrieved session:', {
      clientReferenceId: session.client_reference_id,
      metadata: session.metadata,
      status: session.status,
      mode: session.mode,
      paymentStatus: session.payment_status,
      subscription: session.subscription ? {
        id: (session.subscription as Stripe.Subscription).id,
        status: (session.subscription as Stripe.Subscription).status,
        metadata: (session.subscription as Stripe.Subscription).metadata
      } : null
    });

    // Verify the session belongs to this user
    if (session.client_reference_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if the session was completed
    if (session.status !== 'complete') {
      return res.status(400).json({ 
        error: 'Checkout session not completed',
        status: session.status,
        paymentStatus: session.payment_status
      });
    }

    const subscription = session.subscription as Stripe.Subscription;
    if (!subscription) {
      return res.status(400).json({ error: 'No subscription found in session' });
    }

    // Get the user's data to verify the subscription was recorded
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    console.log('User data:', {
      hasEmbedAccess: !!userData.embedAccess,
      activeEmbeds: userData.embedAccess?.activeEmbeds?.length || 0,
      plans: userData.billing?.plans?.length || 0,
      stripeCustomerId: userData.billing?.stripeCustomerId
    });

    // Get metadata from both session and subscription
    const planType = subscription.items.data[0].price.id === process.env.STRIPE_EMBED_MONTHLY_PRICE_ID ||
                    subscription.items.data[0].price.id === process.env.STRIPE_EMBED_YEARLY_PRICE_ID
                    ? 'embed'
                    : subscription.items.data[0].price.id === process.env.STRIPE_API_PRICE_ID
                    ? 'api'
                    : null;

    const addressId = session.metadata?.addressId || subscription.metadata?.addressId;

    if (!planType) {
      console.error('Could not determine plan type from price ID:', {
        priceId: subscription.items.data[0].price.id,
        embedMonthlyPriceId: process.env.STRIPE_EMBED_MONTHLY_PRICE_ID,
        embedYearlyPriceId: process.env.STRIPE_EMBED_YEARLY_PRICE_ID,
        apiPriceId: process.env.STRIPE_API_PRICE_ID,
        sessionMetadata: session.metadata,
        subscriptionMetadata: subscription.metadata
      });
      return res.status(400).json({ error: 'Invalid price ID - could not determine plan type' });
    }

    // For embed subscriptions, return all necessary data
    if (planType === 'embed') {
      if (!addressId) {
        console.error('Missing addressId in metadata:', {
          sessionMetadata: session.metadata,
          subscriptionMetadata: subscription.metadata,
          sessionId: session.id,
          subscriptionId: subscription.id
        });
        return res.status(400).json({ error: 'Missing address ID for embed subscription' });
      }

      const embed = userData.embedAccess?.activeEmbeds?.find(
        (e: any) => e.addressId === addressId
      );

      if (!embed) {
        console.log('Embed not found in user data, waiting for webhook...', {
          addressId,
          activeEmbeds: userData.embedAccess?.activeEmbeds,
          sessionId: session.id,
          subscriptionId: subscription.id
        });
        return res.status(202).json({ 
          status: 'processing',
          message: 'Subscription is being processed'
        });
      }

      return res.status(200).json({ 
        success: true,
        addressId,
        description: embed.description,
        subscriptionId: subscription.id,
        embedToken: userData.embedAccess.embedToken
      });
    }

    // For other subscription types
    const plan = userData.billing?.plans?.find(
      (p: any) => p.stripeSubscriptionId === subscription.id
    );

    if (!plan) {
      console.log('Plan not found in user data, waiting for webhook...', {
        subscriptionId: subscription.id,
        plans: userData.billing?.plans,
        sessionId: session.id
      });
      return res.status(202).json({ 
        status: 'processing',
        message: 'Subscription is being processed'
      });
    }

    return res.status(200).json({ 
      success: true,
      subscriptionId: subscription.id,
      plan
    });

  } catch (error: any) {
    console.error('Error verifying checkout session:', error);
    return res.status(500).json({ 
      error: 'Failed to verify checkout session',
      details: error.message,
      type: error.type,
      code: error.code
    });
  }
} 