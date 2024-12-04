import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia'
});

async function createEmbedProduct() {
  try {
    // Create the product
    const product = await stripe.products.create({
      name: 'Addressd Embed',
      description: 'Help customers find your business with clear, natural language directions',
    });

    console.log('Created product:', product.id);

    // Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 300, // £3.00
      currency: 'gbp',
      recurring: {
        interval: 'month'
      },
      metadata: {
        type: 'embed',
        billing_period: 'monthly'
      }
    });

    console.log('Created monthly price:', monthlyPrice.id);

    // Create yearly price
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 2000, // £20.00
      currency: 'gbp',
      recurring: {
        interval: 'year'
      },
      metadata: {
        type: 'embed',
        billing_period: 'yearly'
      }
    });

    console.log('Created yearly price:', yearlyPrice.id);

    console.log('\nAdd these to your .env.local:');
    console.log(`STRIPE_EMBED_MONTHLY_PRICE_ID=${monthlyPrice.id}`);
    console.log(`STRIPE_EMBED_YEARLY_PRICE_ID=${yearlyPrice.id}`);

  } catch (error) {
    console.error('Error setting up Stripe products:', error);
  }
}

createEmbedProduct(); 