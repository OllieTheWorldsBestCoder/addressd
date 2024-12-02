import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiCheck, FiX } from 'react-icons/fi';
import Layout from '../components/Layout';

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
        <title>Pricing - Addressd</title>
        <meta name="description" content="Choose the right plan for better delivery experiences" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-primary mb-6"
            >
              Simple, Transparent Pricing
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600"
            >
              Choose the plan that fits your delivery needs, and earn credits by contributing descriptions
            </motion.p>
          </div>

          {/* Billing Toggle */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center items-center space-x-4 mb-12"
          >
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
          </motion.div>

          {/* Pricing Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          >
            {/* Embed Plan */}
            <motion.div variants={itemVariants} className="card relative overflow-hidden">
              <div className="px-6 py-8">
                <h3 className="text-2xl font-bold text-primary mb-4">Embed</h3>
                <p className="text-gray-600 mb-6">Help customers find your business location</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{getEmbedPrice()}</span>
                  <span className="text-gray-600">{getEmbedPeriod()}</span>
                </div>
                <Link
                  href="/embed"
                  className="button button-primary w-full mb-8"
                >
                  Get Started
                </Link>
                <ul className="space-y-4">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-600">
                      {feature.embed ? (
                        <FiCheck className="text-accent mr-2 flex-shrink-0" />
                      ) : (
                        <FiX className="text-gray-400 mr-2 flex-shrink-0" />
                      )}
                      {feature.name}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* API Plan */}
            <motion.div variants={itemVariants} className="card relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-secondary text-white px-4 py-1 rounded-bl-lg text-sm">
                Most Popular
              </div>
              <div className="px-6 py-8">
                <h3 className="text-2xl font-bold text-primary mb-4">API</h3>
                <p className="text-gray-600 mb-6">Perfect for delivery companies and logistics</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">£50</span>
                  <span className="text-gray-600">/month</span>
                  <p className="text-sm text-gray-500 mt-1">+ £0.005 per API call</p>
                  <p className="text-sm text-green-600 mt-1">Earn credits by contributing descriptions</p>
                </div>
                <Link
                  href="/api"
                  className="button button-secondary w-full mb-8"
                >
                  Get Started
                </Link>
                <ul className="space-y-4">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-600">
                      {feature.api ? (
                        <FiCheck className="text-accent mr-2 flex-shrink-0" />
                      ) : (
                        <FiX className="text-gray-400 mr-2 flex-shrink-0" />
                      )}
                      {feature.name}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div variants={itemVariants} className="card relative overflow-hidden">
              <div className="px-6 py-8">
                <h3 className="text-2xl font-bold text-primary mb-4">Enterprise</h3>
                <p className="text-gray-600 mb-6">Custom solutions for large delivery fleets</p>
                <div className="mb-6">
                  <span className="text-2xl font-bold">Custom Pricing</span>
                  <p className="text-sm text-gray-500 mt-1">Tailored to your delivery volume</p>
                </div>
                <Link
                  href="/contact"
                  className="button button-outline w-full mb-8"
                >
                  Contact Sales
                </Link>
                <ul className="space-y-4">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-600">
                      {feature.enterprise ? (
                        <FiCheck className="text-accent mr-2 flex-shrink-0" />
                      ) : (
                        <FiX className="text-gray-400 mr-2 flex-shrink-0" />
                      )}
                      {feature.name}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-24 text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-primary mb-12">Frequently Asked Questions</h2>
            <div className="grid gap-8 text-left">
              <div>
                <h3 className="text-xl font-semibold mb-2">What's included in the Embed plan?</h3>
                <p className="text-gray-600">
                  The Embed plan helps businesses provide clear directions to their location. Add it to your website
                  to help customers find your front door easily.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">How does API pricing work?</h3>
                <p className="text-gray-600">
                  API pricing starts at £50/month which includes your first 10,000 API calls.
                  Additional calls are charged at £0.005 per call. Contribute descriptions to earn free credits!
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">How do contribution credits work?</h3>
                <p className="text-gray-600">
                  Add detailed location descriptions to earn credits. Each approved contribution reduces your API costs,
                  helping you save while improving the service for everyone.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
} 