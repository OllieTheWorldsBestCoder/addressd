import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import Layout from '../components/Layout';
import { auth } from '../config/firebase';
import { User } from 'firebase/auth';
import AddressAutocomplete from '../components/AddressAutocomplete';

export default function Embed() {
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [embedCode, setEmbedCode] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      // If user is not signed in, stay at step 1
      if (!user && step > 1) {
        setStep(1);
      }
    });
    return () => unsubscribe();
  }, [step]);

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
      setStep(3); // Move to description step
    } catch (err) {
      setError('Failed to validate address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDescriptionSubmit = () => {
    if (!description.trim()) {
      setError('Please add a description for your embed');
      return;
    }
    setError(null);
    setStep(4); // Move to pricing table step
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const getTotalSteps = () => {
    return 5; // Total number of steps including final embed code display
  };

  return (
    <Layout>
      <Head>
        <title>Create Your Address Embed - Addressd</title>
        <meta name="description" content="Help customers find your business with clear, natural language directions" />
        <script async src="https://js.stripe.com/v3/pricing-table.js"></script>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          {/* Progress Bar */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-full bg-secondary rounded-full transition-all duration-300"
                style={{ width: `${(step / getTotalSteps()) * 100}%` }}
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
              Help Customers Find You
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600"
            >
              Add clear, natural language directions to your website and help customers get right to your front door
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

            {/* Step 1: Sign In */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card mb-8 ${step === 1 ? 'ring-2 ring-secondary ring-opacity-50' : ''}`}
              style={{ display: step === 1 ? 'block' : 'none' }}
            >
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center">
                  1
                </div>
                <h2 className="text-2xl font-bold ml-4">Sign In</h2>
              </div>

              {!user ? (
                <div className="text-center p-8 bg-white rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold mb-4">Sign in to continue</h3>
                  <p className="text-gray-600 mb-6">
                    Create an account or sign in to create your embed
                  </p>
                  <a href="/signup" className="button button-primary">
                    Sign In
                  </a>
                </div>
              ) : (
                <div className="text-center p-8 bg-white rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold mb-4">Welcome back!</h3>
                  <p className="text-gray-600 mb-6">
                    You're signed in as {user.email}
                  </p>
                  <button
                    onClick={() => setStep(2)}
                    className="button button-primary"
                  >
                    Continue
                  </button>
                </div>
              )}
            </motion.div>

            {/* Step 2: Enter Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card mb-8 ${step === 2 ? 'ring-2 ring-secondary ring-opacity-50' : ''}`}
              style={{ display: step === 2 ? 'block' : 'none' }}
            >
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center">
                  2
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

            {/* Step 3: Add Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card mb-8 ${step === 3 ? 'ring-2 ring-secondary ring-opacity-50' : ''}`}
              style={{ display: step === 3 ? 'block' : 'none' }}
            >
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center">
                  3
                </div>
                <h2 className="text-2xl font-bold ml-4">Add Location Details</h2>
              </div>

              <div className="bg-white rounded-lg p-6 mb-6">
                <label className="block text-gray-700 mb-2">
                  Location Description <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Provide clear directions to help people find your exact location. Include details like:
                  <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li>Which entrance to use</li>
                    <li>Nearby landmarks or reference points</li>
                    <li>Parking instructions</li>
                    <li>Any tricky parts of finding the location</li>
                  </ul>
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., We're located on the ground floor, blue door. The entrance is on the side street, not the main road. Look for the coffee shop next door."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-20 transition-all"
                  rows={6}
                />
              </div>

              <button
                onClick={handleDescriptionSubmit}
                className="button button-primary w-full"
              >
                Continue
              </button>
            </motion.div>

            {/* Step 4: Choose Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card mb-8 ${step === 4 ? 'ring-2 ring-secondary ring-opacity-50' : ''}`}
              style={{ display: step === 4 ? 'block' : 'none' }}
            >
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center">
                  4
                </div>
                <h2 className="text-2xl font-bold ml-4">Choose Your Plan</h2>
              </div>

              <stripe-pricing-table
                pricing-table-id="prctbl_1QRHELLAQAcRVIdeK90CfxM3"
                publishable-key="pk_live_51QRGUDLAQAcRVIdezvMmx2QzsHx0R5uLUr94T7U0cqogvyhASe6RyJFOMVSAMZaadfRMMJFbukJneWoMNNE32LBp00WkyCqRv9"
                client-reference-id={user?.uid}
                customer-email={user?.email || undefined}
              />
            </motion.div>

            {/* Step 5: Embed Code */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card mb-8 ${step === 5 ? 'ring-2 ring-secondary ring-opacity-50' : ''}`}
              style={{ display: step === 5 ? 'block' : 'none' }}
            >
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center">
                  5
                </div>
                <h2 className="text-2xl font-bold ml-4">Your Embed Code</h2>
              </div>

              {embedCode ? (
                <div className="bg-white rounded-lg p-6">
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                    <code>{embedCode}</code>
                  </pre>
                  <button
                    onClick={() => navigator.clipboard.writeText(embedCode)}
                    className="button button-secondary mt-4"
                  >
                    Copy Code
                  </button>
                </div>
              ) : (
                <div className="text-center p-8 bg-white rounded-lg">
                  <p className="text-gray-600">
                    Waiting for payment confirmation...
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 