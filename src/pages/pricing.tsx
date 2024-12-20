import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiCheck, FiX } from 'react-icons/fi';
import Layout from '../components/Layout';
import { trackPricingView, trackPricingToggle, trackCheckoutStart } from '../utils/analytics';

type BillingPeriod = 'monthly' | 'yearly';

interface PricingFeature {
  name: string;
  embed: boolean;
  api: boolean;
  enterprise: boolean;
}

const features: PricingFeature[] = [
  { name: 'Natural Language Directions', embed: true, api: true, enterprise: true },
  { name: 'Delivery Optimization', embed: true, api: true, enterprise: true },
  { name: 'Contribution Credits', embed: true, api: true, enterprise: true },
  { name: 'API Access', embed: false, api: true, enterprise: true },
  { name: 'Usage Analytics', embed: false, api: true, enterprise: true },
  { name: 'Priority Support', embed: false, api: false, enterprise: true },
  { name: 'Custom Integration', embed: false, api: false, enterprise: true },
  { name: 'SLA Agreement', embed: false, api: false, enterprise: true },
];

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  // Track page view
  useEffect(() => {
    trackPricingView('all');
  }, []);

  const handleBillingToggle = (period: BillingPeriod) => {
    setBillingPeriod(period);
    trackPricingToggle(period);
  };

  const handleCheckoutStart = (plan: string, amount: number) => {
    trackCheckoutStart(plan, billingPeriod, amount);
  };

  const getEmbedPrice = () => {
    return billingPeriod === 'monthly' ? '£3' : '£20';
  };

  const getEmbedPeriod = () => {
    return billingPeriod === 'monthly' ? '/month' : '/year';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <Layout>
      <Head>
        <title>pricing - addressd</title>
        <meta name="description" content="Simple, transparent pricing for addressd. Choose the plan that best fits your delivery needs." />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600">
              Choose the plan that best fits your business needs. Save up to 44% with yearly billing.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                className={`px-4 py-2 rounded-md ${billingPeriod === 'monthly' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => handleBillingToggle('monthly')}
              >
                Monthly
              </button>
              <button
                className={`px-4 py-2 rounded-md ${billingPeriod === 'yearly' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => handleBillingToggle('yearly')}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto px-4">
            {/* Embed Plan */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-4">Embed</h3>
              <p className="text-gray-600 mb-6">
                Add natural language directions to your website with our easy-to-use embed.
              </p>
              <div className="mb-8">
                <p className="text-4xl font-bold">
                  {billingPeriod === 'monthly' ? '£3' : '£20'}
                  <span className="text-lg text-gray-500 font-normal">
                    /{billingPeriod === 'monthly' ? 'mo' : 'year'}
                  </span>
                </p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <FiCheck className="h-5 w-5 text-green-500" />
                  <span className="ml-3">Natural language directions</span>
                </li>
                <li className="flex items-center">
                  <FiCheck className="h-5 w-5 text-green-500" />
                  <span className="ml-3">Easy website integration</span>
                </li>
                <li className="flex items-center">
                  <FiCheck className="h-5 w-5 text-green-500" />
                  <span className="ml-3">Usage analytics</span>
                </li>
              </ul>
              <Link 
                href="/signup"
                className="block w-full text-center py-3 px-6 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* API Plan */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-4">API</h3>
              <p className="text-gray-600 mb-6">
                Integrate natural language directions directly into your application.
              </p>
              <div className="mb-8">
                <p className="text-4xl font-bold">
                  £50
                  <span className="text-lg text-gray-500 font-normal">/mo</span>
                </p>
                <p className="text-sm text-gray-500">+ £0.005 per request</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <FiCheck className="h-5 w-5 text-green-500" />
                  <span className="ml-3">RESTful API access</span>
                </li>
                <li className="flex items-center">
                  <FiCheck className="h-5 w-5 text-green-500" />
                  <span className="ml-3">Delivery optimization</span>
                </li>
                <li className="flex items-center">
                  <FiCheck className="h-5 w-5 text-green-500" />
                  <span className="ml-3">Advanced analytics</span>
                </li>
              </ul>
              <Link 
                href="/signup?product=api"
                className="block w-full text-center py-3 px-6 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900">How do contribution credits work?</h3>
                <p className="mt-2 text-gray-600">
                  Earn credits by adding detailed location descriptions. Each approved contribution earns credits that can be used towards your API usage.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">What's included in the API plan?</h3>
                <p className="mt-2 text-gray-600">
                  The API plan includes 10,000 API calls per month, perfect for businesses handling up to 300 deliveries daily. Additional calls are billed at £0.005 per call.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 