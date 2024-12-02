import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

// Add detailed debug logging
const stripeKey = process.env.STRIPE_SECRET_KEY || '';
console.log('Environment Check:', {
  keyType: stripeKey.substring(0, 7), // Just show "sk_live" or "sk_test"
  priceId: process.env.STRIPE_EMBED_MONTHLY_PRICE_ID,
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
  nodeEnv: process.env.NODE_ENV
});

const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
  appInfo: {
    name: 'Addressd',
    version: '1.0.0'
  },
  telemetry: false // Disable usage tracking
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, addressId, description } = req.body;

    // Log the configuration being used
    console.log('Stripe Configuration:', {
      keyType: stripeKey.substring(0, 7),
      priceId: process.env.STRIPE_EMBED_MONTHLY_PRICE_ID,
      isLiveMode: stripeKey.startsWith('sk_live_')
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_EMBED_MONTHLY_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/embed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/embed`,
      client_reference_id: userId,
      subscription_data: {
        metadata: {
          userId: userId,
          addressId: addressId,
          plan_type: 'embed'
        }
      },
      metadata: {
        addressId: addressId,
        description: description,
        plan_type: 'embed'
      },
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (error: any) {
    // Enhanced error logging
    console.error('Stripe Error:', {
      type: error.type,
      message: error.message,
      code: error.code,
      param: error.param,
      raw: error.raw
    });
    
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
} 