import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import Layout from '../components/Layout';
import { auth } from '../config/firebase';
import { User } from 'firebase/auth';
import AddressAutocomplete from '../components/AddressAutocomplete';
import '../types/stripe'; // Import the type definitions

export default function Embed() {
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleAddressValidation = async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/address/validate-frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate address');
      }

      const result = await response.json();
      setValidationResult(result);
      setStep(2);
    } catch (err) {
      setError('Failed to validate address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  return (
    <Layout>
      <Head>
        <title>Create Embed - Addressd</title>
        <meta name="description" content="Add address validation to your website in minutes" />
        <script async src="https://js.stripe.com/v3/pricing-table.js"></script>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          {/* Progress Bar */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-full bg-secondary rounded-full transition-all duration-300"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>
          </div>

          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-primary mb-6"
            >
              Create Your Address Embed
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600"
            >
              Add address validation to your website in minutes
            </motion.p>
          </div>

          {/* Steps */}
          <div className="max-w-4xl mx-auto">
            {/* Step Navigation */}
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
              >
                <FiArrowLeft className="mr-2" />
                Back
              </button>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Step 1: Enter Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`card mb-8 ${step === 1 ? 'ring-2 ring-secondary ring-opacity-50' : ''}`}
              style={{ display: step === 1 ? 'block' : 'none' }}
            >
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center">
                  1
                </div>
                <h2 className="text-2xl font-bold ml-4">Enter Address</h2>
              </div>
              
              <div className="bg-white rounded-lg p-6 mb-6">
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  onSelect={(place) => {
                    setAddress(place.formatted_address || '');
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-20 transition-all"
                />
              </div>

              <button
                onClick={handleAddressValidation}
                className="button button-primary w-full"
                disabled={loading || !address}
              >
                {loading ? 'Validating...' : 'Continue'}
              </button>
            </motion.div>

            {/* Step 2: Choose Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`card mb-8 ${step === 2 ? 'ring-2 ring-secondary ring-opacity-50' : ''}`}
              style={{ display: step === 2 ? 'block' : 'none' }}
            >
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center">
                  2
                </div>
                <h2 className="text-2xl font-bold ml-4">Choose Your Plan</h2>
              </div>

              {user ? (
                <div className="mt-6">
                  <stripe-pricing-table
                    pricing-table-id={process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID || ''}
                    publishable-key={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
                    client-reference-id={user.uid}
                    customer-email={user.email || undefined}
                  />
                </div>
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Sign in to continue</h3>
                  <p className="text-gray-600 mb-6">
                    Create an account or sign in to view pricing and create your embed
                  </p>
                  <a href="/signup" className="button button-primary">
                    Sign In
                  </a>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 