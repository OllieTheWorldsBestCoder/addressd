import { config } from 'dotenv';
import { resolve } from 'path';
import Stripe from 'stripe';

config({ path: resolve(process.cwd(), '.env.local') });

// Using live mode credentials
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
});

async function createPortalConfiguration() {
  try {
    // Verify we're using live mode credentials
    if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
      throw new Error('Must use live mode secret key for production portal configuration');
    }

    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your Addressd subscription',
        privacy_policy_url: `${process.env.NEXT_PUBLIC_BASE_URL}/privacy`,
        terms_of_service_url: `${process.env.NEXT_PUBLIC_BASE_URL}/terms`
      },
      features: {
        customer_update: {
          allowed_updates: ['email', 'address'],
          enabled: true
        },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end'
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          products: [{
            product: process.env.STRIPE_EMBED_PRODUCT_ID!,
            prices: [
              process.env.STRIPE_EMBED_MONTHLY_PRICE_ID!,
              process.env.STRIPE_EMBED_YEARLY_PRICE_ID!
            ]
          }]
        }
      }
    });

    console.log('Live mode portal configuration created:', configuration.id);
    
    // Add the configuration ID to .env.local
    console.log('\nAdd this line to your .env.local file:');
    console.log(`STRIPE_PORTAL_CONFIGURATION_ID=${configuration.id}`);

  } catch (error) {
    console.error('Error creating portal configuration:', error);
  }
}

createPortalConfiguration(); 