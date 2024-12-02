import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { authenticateRequest } from '../../middleware/auth';

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
    const user = await authenticateRequest(req, res);
    if (!user || !user.billing?.stripeCustomerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.billing.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile`,
      configuration: {
        features: {
          subscription_cancel: {
            enabled: true,
            mode: 'at_period_end',
            proration_behavior: 'create_prorations'
          },
          subscription_pause: {
            enabled: true
          },
          payment_method_update: {
            enabled: true
          },
          invoice_history: {
            enabled: true
          }
        },
        business_information: {
          headline: 'Manage your Addressd subscription'
        }
      }
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
} 