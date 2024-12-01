import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

async function createProducts() {
  try {
    // Create Embed Product
    const embedProduct = await stripe.products.create({
      name: 'Addressd Embed',
      description: 'Embed address descriptions on your website'
    });

    // Create Monthly Price
    const monthlyPrice = await stripe.prices.create({
      product: embedProduct.id,
      unit_amount: 300, // £3.00
      currency: 'gbp',
      recurring: {
        interval: 'month'
      }
    });

    // Create Yearly Price
    const yearlyPrice = await stripe.prices.create({
      product: embedProduct.id,
      unit_amount: 2000, // £20.00
      currency: 'gbp',
      recurring: {
        interval: 'year'
      }
    });

    // Create API Product
    const apiProduct = await stripe.products.create({
      name: 'Addressd API',
      description: 'Access to the Addressd API with usage-based billing'
    });

    // Create API Price
    const apiPrice = await stripe.prices.create({
      product: apiProduct.id,
      unit_amount: 0.5, // £0.005
      currency: 'gbp',
      recurring: {
        interval: 'month'
      },
      billing_scheme: 'per_unit'
    });

    console.log('Products and prices created:', {
      embedProduct: embedProduct.id,
      monthlyPrice: monthlyPrice.id,
      yearlyPrice: yearlyPrice.id,
      apiProduct: apiProduct.id,
      apiPrice: apiPrice.id
    });

  } catch (error) {
    console.error('Error creating products:', error);
  }
}

createProducts(); 