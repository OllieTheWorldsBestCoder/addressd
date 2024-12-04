import { useState, useEffect } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('EmbedPricingTable props:', { userId, addressId, description });
  }, [userId, addressId, description]);

  const handleSubscribe = async () => {
    try {
      setError(null);
      setLoading(true);

      if (!userId || !addressId) {
        console.error('Missing required information:', { userId, addressId });
        setError('Missing required information. Please try again.');
        return;
      }

      console.log('Creating checkout session with:', {
        userId,
        addressId,
        description,
        billingPeriod
      });

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

      const data = await response.json();
      console.log('Checkout session response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (!data.url) {
        throw new Error('No checkout URL received');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      setError(error.message || 'Failed to create checkout session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}
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
          disabled={loading}
          className="w-full bg-primary text-white py-3 px-6 rounded-lg mb-8 hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Get Started'}
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