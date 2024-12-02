import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { FiCode, FiCopy, FiCheck, FiExternalLink, FiLock, FiArrowLeft } from 'react-icons/fi';
import Layout from '../components/Layout';
import { auth } from '../config/firebase';
import { User } from 'firebase/auth';
import AddressAutocomplete from '../components/AddressAutocomplete';

export default function Embed() {
  const [user, setUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewAddress, setPreviewAddress] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEmbedCode = (domain: string) => {
    return `<script src="https://addressd.vercel.app/embed.js"></script>
<div id="addressd-embed" data-domain="${domain}"></div>`;
  };

  const validateDomain = (domain: string) => {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    return domainRegex.test(domain);
  };

  const handleAddressValidation = async () => {
    if (!previewAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/address/validate-frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: previewAddress }),
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

  const handleCreateEmbed = async () => {
    if (!selectedDomain || !validateDomain(selectedDomain)) {
      setError('Please enter a valid domain');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-embed-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
          domain: selectedDomain,
          addressId: validationResult?.addressId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      const stripe = await import('@stripe/stripe-js').then((mod) => mod.loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
      ));
      await stripe?.redirectToCheckout({ sessionId });
    } catch (err) {
      setError('Failed to start checkout. Please try again.');
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
        <title>Embed Address Validation - Addressd</title>
        <meta name="description" content="Add address validation to your website in minutes" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          {/* Progress Bar */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-full bg-secondary rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
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
              Add Address Validation to Your Website
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600"
            >
              Get started in minutes with our simple embed code
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

            {/* Step 1: Preview */}
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
                <h2 className="text-2xl font-bold ml-4">Try it out</h2>
              </div>
              
              <div className="bg-white rounded-lg p-6 mb-6">
                <AddressAutocomplete
                  value={previewAddress}
                  onChange={setPreviewAddress}
                  onSelect={(place) => {
                    setPreviewAddress(place.formatted_address || '');
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-20 transition-all"
                />
              </div>

              <button
                onClick={handleAddressValidation}
                className="button button-primary w-full"
                disabled={loading || !previewAddress}
              >
                {loading ? 'Validating...' : 'Continue'}
              </button>
            </motion.div>

            {/* Step 2: Configure */}
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
                <h2 className="text-2xl font-bold ml-4">Configure</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website Domain
                  </label>
                  <input
                    type="text"
                    value={selectedDomain}
                    onChange={(e) => {
                      setSelectedDomain(e.target.value);
                      setError(null);
                    }}
                    placeholder="example.com"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-opacity-20 transition-all ${
                      error ? 'border-red-300 focus:border-red-400 focus:ring-red-200' :
                      'border-gray-200 focus:border-secondary focus:ring-secondary'
                    }`}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Enter the domain where you'll embed the address validation
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (validateDomain(selectedDomain)) {
                    setError(null);
                    setStep(3);
                  } else {
                    setError('Please enter a valid domain');
                  }
                }}
                className="button button-primary w-full mt-6"
                disabled={loading || !selectedDomain}
              >
                Continue
              </button>
            </motion.div>

            {/* Step 3: Get Code */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`card ${step === 3 ? 'ring-2 ring-secondary ring-opacity-50' : ''}`}
              style={{ display: step === 3 ? 'block' : 'none' }}
            >
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center">
                  3
                </div>
                <h2 className="text-2xl font-bold ml-4">Get the Code</h2>
              </div>

              {user ? (
                <>
                  <div className="bg-gray-900 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <FiCode className="text-gray-400 mr-2" />
                        <span className="text-gray-400">Embed Code</span>
                      </div>
                      <button
                        onClick={() => handleCopyCode(getEmbedCode(selectedDomain))}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {copied ? <FiCheck /> : <FiCopy />}
                      </button>
                    </div>
                    <pre className="text-gray-300 overflow-x-auto">
                      {getEmbedCode(selectedDomain)}
                    </pre>
                  </div>

                  <button
                    onClick={handleCreateEmbed}
                    className="button button-primary w-full"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Start Free Trial'}
                  </button>
                  <p className="text-sm text-gray-500 text-center mt-4">
                    £3/month · Cancel anytime
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <FiLock className="text-2xl text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Sign in to continue</h3>
                  <p className="text-gray-600 mb-6">
                    Create an account or sign in to get your embed code
                  </p>
                  <a
                    href="/signup"
                    className="button button-primary"
                  >
                    Sign In
                  </a>
                </div>
              )}
            </motion.div>
          </div>

          {/* Features */}
          <div className="mt-24 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid md:grid-cols-3 gap-8"
            >
              <div className="card">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-secondary bg-opacity-10 rounded-lg">
                    <FiCode className="text-2xl text-secondary" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">Easy Setup</h3>
                </div>
                <p className="text-gray-600">
                  Add our embed code to your website and you're ready to go
                </p>
              </div>

              <div className="card">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-accent bg-opacity-10 rounded-lg">
                    <FiExternalLink className="text-2xl text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">Customizable</h3>
                </div>
                <p className="text-gray-600">
                  Match your website's design with custom styling options
                </p>
              </div>

              <div className="card">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-primary bg-opacity-10 rounded-lg">
                    <FiLock className="text-2xl text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">Secure</h3>
                </div>
                <p className="text-gray-600">
                  Enterprise-grade security with domain verification
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 