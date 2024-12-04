import { useState } from 'react';
import { FiCheck } from 'react-icons/fi';

interface EmbedPricingTableProps {
  userId?: string;
  addressId: string;
  description?: string;
}

const features = [
  'Natural Language Directions',
  'Delivery Optimization',
  'Contribution Credits',
  'Unlimited Directions',
  'Priority Support'
];

export default function EmbedPricingTable({ userId, addressId, description }: EmbedPricingTableProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const handleSubscribe = async () => {
    try {
      const response = await fetch('/api/create-embed-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          addressId,
          description,
          billingPeriod
        }),
      });

      const { sessionId, url } = await response.json();

      if (!url) {
        throw new Error('No checkout URL received');
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Billing Toggle */}
      <div className="flex justify-center items-center space-x-4 mb-8">
        <button
          onClick={() => setBillingPeriod('monthly')}
          className={`px-4 py-2 rounded-full transition-all ${
            billingPeriod === 'monthly'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingPeriod('yearly')}
          className={`px-4 py-2 rounded-full transition-all ${
            billingPeriod === 'yearly'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Yearly
          <span className="ml-2 text-sm bg-accent text-white px-2 py-0.5 rounded-full">
            Save 44%
          </span>
        </button>
      </div>

      {/* Pricing Card */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-primary mb-4">Embed Plan</h3>
        <p className="text-gray-600 mb-6">Help customers find your business location</p>
        
        <div className="mb-6">
          <span className="text-4xl font-bold">
            {billingPeriod === 'monthly' ? '£3' : '£20'}
          </span>
          <span className="text-gray-600">
            {billingPeriod === 'monthly' ? '/month' : '/year'}
          </span>
        </div>

        <button
          onClick={handleSubscribe}
          className="w-full bg-primary text-white py-3 px-6 rounded-lg mb-8 hover:bg-primary-dark transition-colors"
        >
          Get Started
        </button>

        <ul className="space-y-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center text-gray-600">
              <FiCheck className="text-accent mr-2 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 