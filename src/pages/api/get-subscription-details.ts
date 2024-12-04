import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../config/stripe';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { subscriptionId } = req.query;

  if (!subscriptionId || typeof subscriptionId !== 'string') {
    return res.status(400).json({ message: 'Subscription ID is required' });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    return res.status(200).json({
      nextPaymentTimestamp: subscription.current_period_end * 1000,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart: subscription.current_period_start * 1000,
      cancelAt: subscription.cancel_at ? subscription.cancel_at * 1000 : null
    });
  } catch (stripeError: any) {
    console.error('Stripe error:', stripeError);
    if (stripeError.code === 'resource_missing') {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    return res.status(500).json({ message: 'Error fetching subscription details' });
  }
} 