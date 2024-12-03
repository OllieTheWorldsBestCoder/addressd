import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

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
    const { sessionId, userId } = req.body;

    if (!sessionId || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('Verifying checkout session:', { sessionId, userId });

    // Retrieve the session with expanded subscription data
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    console.log('Retrieved session:', {
      clientReferenceId: session.client_reference_id,
      metadata: session.metadata,
      status: session.status
    });

    // Verify the session belongs to this user
    if (session.client_reference_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if the session was completed
    if (session.status !== 'complete') {
      return res.status(400).json({ 
        error: 'Checkout session not completed',
        status: session.status
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
      plans: userData.billing?.plans?.length || 0
    });

    // Get metadata from both session and subscription
    const planType = subscription.metadata?.plan_type || 'embed';
    const addressId = session.metadata?.addressId || subscription.metadata?.addressId;

    // For embed subscriptions, return all necessary data
    if (planType === 'embed') {
      if (!addressId) {
        console.error('Missing addressId in metadata:', {
          sessionMetadata: session.metadata,
          subscriptionMetadata: subscription.metadata
        });
        return res.status(400).json({ error: 'Missing address ID for embed subscription' });
      }

      const embed = userData.embedAccess?.activeEmbeds?.find(
        (e: any) => e.addressId === addressId
      );

      if (!embed) {
        console.log('Embed not found in user data, waiting for webhook...', {
          addressId,
          activeEmbeds: userData.embedAccess?.activeEmbeds
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
        plans: userData.billing?.plans
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
      details: error.message 
    });
  }
} 