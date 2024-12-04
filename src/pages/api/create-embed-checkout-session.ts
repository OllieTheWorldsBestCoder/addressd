import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../config/stripe';

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
    const { userId, addressId, description, billingPeriod } = req.body;

    if (!userId || !addressId || !billingPeriod) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get the appropriate price ID based on billing period
    const priceId = billingPeriod === 'monthly' 
      ? process.env.STRIPE_EMBED_MONTHLY_PRICE_ID 
      : process.env.STRIPE_EMBED_YEARLY_PRICE_ID;

    if (!priceId) {
      return res.status(500).json({ error: 'Price ID not configured' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/embed-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/embed`,
      client_reference_id: userId,
      subscription_data: {
        metadata: {
          userId,
          addressId,
          plan_type: 'embed',
          billing_period: billingPeriod
        }
      },
      metadata: {
        addressId,
        description: description || '',
        plan_type: 'embed',
        billing_period: billingPeriod
      },
    });

    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
} 